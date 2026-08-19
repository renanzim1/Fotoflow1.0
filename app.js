const cfg = window.FOTOFLOW_CONFIG;
const app = document.querySelector('#app');

const sb = supabase.createClient(
  cfg.supabaseUrl,
  cfg.supabaseAnonKey
);

const publicSb = supabase.createClient(
  cfg.supabaseUrl,
  cfg.supabaseAnonKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
);

const state = {
  initialSelected: [],
  finalSelected: [],

  readyFiles: [],
  readyPreviews: [],

  categoryFiles: [],
  categoryPreviews: [],

  coverFile: null,
  coverPreview: null,

  adminUser: null
};


/* =========================================================
   UTILIDADES
========================================================= */

function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function jsq(value = '') {
  return String(value)
    .replaceAll('\\', '\\\\')
    .replaceAll("'", "\\'");
}

function toast(text) {
  const el = document.querySelector('#toast');

  if (!el) {
    alert(text);
    return;
  }

  el.textContent = text;
  el.style.display = 'block';

  setTimeout(() => {
    el.style.display = 'none';
  }, 2600);
}

function safeFileName(name) {
  return String(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9._-]/g, '-');
}

function randomId() {
  if (crypto?.randomUUID) {
    return crypto.randomUUID();
  }

  return (
    Date.now() +
    '-' +
    Math.random().toString(36).slice(2)
  );
}

function publicStoragePath(url, bucket) {
  const token =
    `/storage/v1/object/public/${bucket}/`;

  const position =
    String(url).indexOf(token);

  if (position < 0) {
    return null;
  }

  return decodeURIComponent(
    String(url).slice(
      position + token.length
    )
  );
}

function adminNav(active) {
  const items = [
    ['dashboard', 'Dashboard'],
    ['pedidos', 'Pedidos'],
    ['nichos', 'Nichos / Ensaios'],
    ['galerias', 'Galerias prontas'],
    ['finais', 'Seleções finais']
  ];

  return `
    <div
      style="
        display:flex;
        gap:8px;
        overflow-x:auto;
        padding:4px 0 16px;
        margin-bottom:18px;
      "
    >
      ${items.map(([id, label]) => `
        <button
          onclick="adminPage('${id}')"
          style="
            white-space:nowrap;
            ${
              active === id
                ? 'background:#111;color:#fff;'
                : ''
            }
          "
        >
          ${label}
        </button>
      `).join('')}

      <button
        onclick="logoutAdmin()"
        style="white-space:nowrap;"
      >
        Sair
      </button>
    </div>
  `;
}

function adminLayout(active, title, subtitle, content) {
  app.innerHTML = `
    <div class="wrap">

      <div class="hero">
        <p class="muted">
          PAINEL ADMINISTRATIVO
        </p>

        <h1>${title}</h1>

        <p class="muted">
          ${subtitle}
        </p>
      </div>

      ${adminNav(active)}

      ${content}

    </div>
  `;
}


/* =========================================================
   HOME PÚBLICA
========================================================= */

async function home() {
  state.initialSelected = [];

  app.innerHTML = `
    <div
      class="wrap"
      style="
        text-align:center;
        padding-top:70px;
      "
    >
      <h2>Carregando ensaios...</h2>
    </div>
  `;

  const {
    data: categories,
    error
  } =
    await publicSb
      .from('categories')
      .select('*')
      .eq('active', true)
      .order('sort_order', {
        ascending: true
      })
      .order('created_at', {
        ascending: true
      });

  if (error) {
    console.error(error);

    app.innerHTML = `
      <div class="wrap">
        <div class="hero">
          <h1>Não foi possível carregar os ensaios.</h1>
          <p class="muted">
            Tente atualizar a página.
          </p>
        </div>
      </div>
    `;

    return;
  }

  app.innerHTML = `
    <div class="wrap">

      <section class="hero">

        <p class="muted">
          ESCOLHA SEU ESTILO
        </p>

        <h1>
          Seu ensaio começa aqui.
        </h1>

        <p class="muted">
          Escolha uma categoria,
          marque suas fotos favoritas
          e envie sua seleção.
        </p>

      </section>

      ${
        categories?.length
          ?
          `
            <div class="grid">

              ${categories.map(c => `
                <article class="card">

                  ${
                    c.cover_url
                      ?
                      `
                        <img
                          class="cover"
                          src="${esc(c.cover_url)}"
                          alt="${esc(c.name)}"
                        >
                      `
                      :
                      `
                        <div
                          style="
                            min-height:240px;
                            display:flex;
                            align-items:center;
                            justify-content:center;
                            background:#eee;
                          "
                        >
                          Sem capa
                        </div>
                      `
                  }

                  <div class="pad">

                    <h2>
                      ${esc(c.name)}
                    </h2>

                    <p class="muted">
                      ${esc(c.description || '')}
                    </p>

                    <button
                      class="primary"
                      onclick="openCategory('${c.id}')"
                    >
                      Ver fotos
                    </button>

                  </div>

                </article>
              `).join('')}

            </div>
          `
          :
          `
            <div class="adminCard">

              <h3>
                Nenhum ensaio disponível ainda.
              </h3>

              <p class="muted">
                Novos ensaios serão publicados em breve.
              </p>

            </div>
          `
      }

    </div>
  `;
}

async function openCategory(categoryId) {
  state.initialSelected = [];

  const [
    categoryResult,
    photosResult
  ] = await Promise.all([

    publicSb
      .from('categories')
      .select('*')
      .eq('id', Number(categoryId))
      .eq('active', true)
      .single(),

    publicSb
      .from('category_photos')
      .select('*')
      .eq(
        'category_id',
        Number(categoryId)
      )
      .order(
        'sort_order',
        { ascending: true }
      )
      .order(
        'created_at',
        { ascending: true }
      )
  ]);

  if (
    categoryResult.error ||
    !categoryResult.data
  ) {
    toast('Ensaio não encontrado.');
    home();
    return;
  }

  const category =
    categoryResult.data;

  const photos =
    photosResult.data || [];

  app.innerHTML = `
    <div class="wrap">

      <button onclick="home()">
        ← Voltar
      </button>

      <div class="hero">

        <p class="muted">
          ENSAIO
        </p>

        <h1>
          ${esc(category.name)}
        </h1>

        <p class="muted">
          ${
            esc(
              category.description ||
              'Toque nas fotos que deseja.'
            )
          }
        </p>

      </div>

      ${
        photos.length
          ?
          `
            <div class="grid">

              ${photos.map(photo => `
                <div
                  class="photoWrap card"
                  id="initial-${photo.id}"
                  onclick="pickInitial('${photo.id}')"
                  style="position:relative;"
                >

                  <img
                    class="photo"
                    src="${esc(photo.photo_url)}"
                    alt="${esc(photo.file_name || '')}"
                  >

                  <span
                    class="badge"
                    style="display:none"
                  >
                    ✓ Selecionada
                  </span>

                </div>
              `).join('')}

            </div>
          `
          :
          `
            <div class="adminCard">
              <h3>
                Nenhuma foto cadastrada neste ensaio.
              </h3>
            </div>
          `
      }

    </div>

    ${
      photos.length
        ?
        `
          <div class="bar">

            <b>
              <span id="count">
                0
              </span>
              selecionadas
            </b>

            <button
              class="primary"
              onclick="checkoutCategory('${category.id}')"
            >
              Continuar →
            </button>

          </div>
        `
        :
        ''
    }
  `;

  window.currentCategoryPhotos = photos;
  window.currentCategoryData = category;
}


function pickInitial(photoId) {
  const id =
    Number(photoId);

  const index =
    state.initialSelected
      .indexOf(id);

  if (index < 0) {
    state.initialSelected.push(id);
  } else {
    state.initialSelected.splice(
      index,
      1
    );
  }

  const selected =
    state.initialSelected
      .includes(id);

  const el =
    document.querySelector(
      '#initial-' + id
    );

  if (el) {
    el.classList.toggle(
      'selected',
      selected
    );

    const badge =
      el.querySelector('.badge');

    if (badge) {
      badge.style.display =
        selected
          ? 'block'
          : 'none';
    }
  }

  const count =
    document.querySelector('#count');

  if (count) {
    count.textContent =
      state.initialSelected.length;
  }
}


function checkoutCategory(categoryId) {
  if (
    !state.initialSelected.length
  ) {
    toast(
      'Selecione pelo menos uma foto.'
    );
    return;
  }

  const category =
    window.currentCategoryData;

  const photos =
    window.currentCategoryPhotos || [];

  const selectedObjects =
    photos
      .filter(photo =>
        state.initialSelected
          .includes(
            Number(photo.id)
          )
      )
      .map(photo => ({
        id: photo.id,
        photo_url: photo.photo_url,
        file_name:
          photo.file_name || ''
      }));

  window.currentInitialSelection =
    selectedObjects;

  app.innerHTML = `
    <div
      class="wrap"
      style="max-width:620px;"
    >

      <button
        onclick="openCategory('${categoryId}')"
      >
        ← Voltar
      </button>

      <div class="hero">

        <h1>
          Quase pronto.
        </h1>

        <p class="muted">
          Informe seus dados
          para identificar a seleção.
        </p>

      </div>

      <label>
        Seu nome
      </label>

      <input
        id="client"
        class="input"
        placeholder="Nome completo"
      >

      <label>
        WhatsApp
      </label>

      <input
        id="phone"
        class="input"
        inputmode="tel"
        placeholder="(00) 00000-0000"
      >

      <label>
        Observação (opcional)
      </label>

      <textarea
        id="note"
        class="input"
        rows="4"
        placeholder="Algum pedido especial?"
      ></textarea>

      <button
        class="primary"
        style="width:100%;"
        onclick="sendOrderDynamic('${categoryId}')"
      >
        Enviar minhas escolhas
      </button>

    </div>
  `;
}


async function sendOrderDynamic(categoryId) {
  const client =
    document
      .querySelector('#client')
      .value
      .trim();

  const phone =
    document
      .querySelector('#phone')
      .value
      .trim();

  const note =
    document
      .querySelector('#note')
      .value
      .trim();

  if (!client || !phone) {
    toast(
      'Preencha nome e WhatsApp.'
    );
    return;
  }

  const category =
    window.currentCategoryData;

  const selection =
    window.currentInitialSelection || [];

  const order = {
    client_name: client,
    phone,
    category: String(categoryId),
    category_name:
      category?.name || '',
    selected_photos:
      selection,
    note,
    status:
      'Nova seleção'
  };

  const { error } =
    await publicSb
      .from('orders')
      .insert(order);

  if (error) {
    console.error(error);

    toast(
      'Erro ao enviar: ' +
      error.message
    );

    return;
  }

  app.innerHTML = `
    <div
      class="wrap"
      style="
        max-width:650px;
        text-align:center;
        padding-top:90px;
      "
    >

      <h1>
        Seleção enviada! ✓
      </h1>

      <p class="muted">
        Recebemos suas escolhas.
        Agora o estúdio poderá
        preparar suas fotos.
      </p>

      <button
        class="primary"
        onclick="home()"
      >
        Voltar ao início
      </button>

    </div>
  `;
}


/* =========================================================
   LOGIN ADMIN
========================================================= */

async function admin() {
  const {
    data: sessionData
  } =
    await sb.auth.getSession();

  if (
    sessionData?.session?.user
  ) {
    const ok =
      await verifyAdmin(
        sessionData.session.user
      );

    if (ok) {
      adminPage('dashboard');
      return;
    }
  }

  renderAdminLogin();
}


function renderAdminLogin() {
  app.innerHTML = `
    <div
      class="wrap"
      style="
        max-width:520px;
        padding-top:55px;
      "
    >

      <button onclick="home()">
        ← Voltar
      </button>

      <div class="hero">

        <p class="muted">
          FOTOFlow ADMIN
        </p>

        <h1>
          Entrar no painel
        </h1>

        <p class="muted">
          Use o e-mail e a senha
          cadastrados no Supabase.
        </p>

      </div>

      <label>
        E-mail
      </label>

      <input
        id="adminEmail"
        type="email"
        class="input"
        autocomplete="email"
        placeholder="seu@email.com"
      >

      <label>
        Senha
      </label>

      <input
        id="adminPassword"
        type="password"
        class="input"
        autocomplete="current-password"
        placeholder="Sua senha"
      >

      <button
        class="primary"
        style="width:100%;"
        onclick="loginAdmin()"
      >
        Entrar
      </button>

    </div>
  `;
}


async function loginAdmin() {
  const email =
    document
      .querySelector('#adminEmail')
      .value
      .trim();

  const password =
    document
      .querySelector('#adminPassword')
      .value;

  if (
    !email ||
    !password
  ) {
    toast(
      'Informe e-mail e senha.'
    );
    return;
  }

  toast('Entrando...');

  const {
    data,
    error
  } =
    await sb.auth
      .signInWithPassword({
        email,
        password
      });

  if (
    error ||
    !data?.user
  ) {
    toast(
      'Não foi possível entrar. Confira seus dados.'
    );
    return;
  }

  const ok =
    await verifyAdmin(
      data.user
    );

  if (!ok) {
    await sb.auth.signOut();

    toast(
      'Esta conta não possui acesso administrativo.'
    );

    return;
  }

  adminPage('dashboard');
}


async function verifyAdmin(user) {
  if (!user) {
    return false;
  }

  const {
    data,
    error
  } =
    await sb
      .from('admin_users')
      .select('user_id')
      .eq(
        'user_id',
        user.id
      )
      .maybeSingle();

  if (
    error ||
    !data
  ) {
    console.error(error);
    return false;
  }

  state.adminUser = user;

  return true;
}


async function requireAdmin() {
  const {
    data
  } =
    await sb.auth.getUser();

  if (!data?.user) {
    renderAdminLogin();
    return false;
  }

  return await verifyAdmin(
    data.user
  );
}


async function logoutAdmin() {
  await sb.auth.signOut();

  state.adminUser = null;

  toast('Sessão encerrada.');

  home();
}

/* =========================================================
   DADOS ADMIN
========================================================= */

async function getOrders() {
  const {
    data,
    error
  } =
    await publicSb
      .from('orders')
      .select('*')
      .order(
        'created_at',
        { ascending: false }
      );

  if (error) {
    console.error(error);
    return [];
  }

  return data || [];
}


async function getGalleries() {
  const {
    data,
    error
  } =
    await publicSb
      .from('galleries')
      .select('*')
      .order(
        'created_at',
        { ascending: false }
      );

  if (error) {
    console.error(error);
    return [];
  }

  return data || [];
}


async function getFinalSelections() {
  const {
    data,
    error
  } =
    await publicSb
      .from('final_selections')
      .select('*')
      .order(
        'created_at',
        { ascending: false }
      );

  if (error) {
    console.error(error);
    return [];
  }

  return data || [];
}


async function getAdminCategories() {
  const {
    data,
    error
  } =
    await sb
      .from('categories')
      .select('*')
      .order(
        'sort_order',
        { ascending: true }
      )
      .order(
        'created_at',
        { ascending: true }
      );

  if (error) {
    console.error(error);
    return [];
  }

  return data || [];
}


async function adminPage(page) {
  const allowed =
    await requireAdmin();

  if (!allowed) {
    return;
  }

  if (page === 'pedidos') {
    await renderOrdersAdmin();
    return;
  }

  if (page === 'nichos') {
    await renderCategoriesAdmin();
    return;
  }

  if (page === 'galerias') {
    await renderGalleriesAdmin();
    return;
  }

  if (page === 'finais') {
    await renderFinalSelectionsAdmin();
    return;
  }

  await renderDashboard();
}


/* =========================================================
   DASHBOARD
========================================================= */

async function renderDashboard() {
  const [
    orders,
    galleries,
    finals,
    categories
  ] = await Promise.all([
    getOrders(),
    getGalleries(),
    getFinalSelections(),
    getAdminCategories()
  ]);

  const newOrders =
    orders.filter(o =>
      (
        o.status ||
        'Nova seleção'
      ) === 'Nova seleção'
    ).length;

  const activeCategories =
    categories.filter(
      c => c.active
    ).length;

  const content = `
    <div
      style="
        display:grid;
        grid-template-columns:
          repeat(2,minmax(0,1fr));
        gap:12px;
      "
    >

      <div class="adminCard">
        <p class="muted">
          TOTAL DE PEDIDOS
        </p>
        <h2>
          ${orders.length}
        </h2>
      </div>

      <div class="adminCard">
        <p class="muted">
          NOVOS PEDIDOS
        </p>
        <h2>
          ${newOrders}
        </h2>
      </div>

      <div class="adminCard">
        <p class="muted">
          GALERIAS PUBLICADAS
        </p>
        <h2>
          ${galleries.length}
        </h2>
      </div>

      <div class="adminCard">
        <p class="muted">
          SELEÇÕES FINAIS
        </p>
        <h2>
          ${finals.length}
        </h2>
      </div>

      <div class="adminCard">
        <p class="muted">
          NICHOS ATIVOS
        </p>
        <h2>
          ${activeCategories}
        </h2>
      </div>

      <div class="adminCard">
        <p class="muted">
          TOTAL DE NICHOS
        </p>
        <h2>
          ${categories.length}
        </h2>
      </div>

    </div>
  `;

  adminLayout(
    'dashboard',
    'Dashboard',
    'Visão geral do FotoFlow.',
    content
  );
}


/* =========================================================
   PEDIDOS
========================================================= */

function orderPhotosHtml(selected) {
  if (!Array.isArray(selected)) {
    return '';
  }

  return selected.map(
    (item, i) => {

      if (
        item &&
        typeof item === 'object' &&
        item.photo_url
      ) {
        return `
          <div
            style="
              min-width:140px;
              max-width:140px;
            "
          >
            <img
              src="${esc(item.photo_url)}"
              style="
                width:140px;
                height:180px;
                object-fit:cover;
                border-radius:16px;
                display:block;
              "
            >

            <div
              style="
                text-align:center;
                font-weight:700;
                margin-top:6px;
              "
            >
              Foto ${i + 1}
            </div>
          </div>
        `;
      }

      return `
        <div
          style="
            min-width:140px;
            max-width:140px;
            height:180px;
            border-radius:16px;
            background:#eee;
            display:flex;
            align-items:center;
            justify-content:center;
            text-align:center;
            padding:10px;
          "
        >
          <span>
            Referência antiga<br>
            Foto ${Number(item) + 1}
          </span>
        </div>
      `;
    }
  ).join('');
}


function finalPhotosHtml(urls) {
  if (!Array.isArray(urls)) {
    return '';
  }

  return urls.map(
    (url, i) => `
      <div
        style="
          min-width:140px;
          max-width:140px;
        "
      >

        <a
          href="${esc(url)}"
          target="_blank"
        >
          <img
            src="${esc(url)}"
            style="
              width:140px;
              height:180px;
              object-fit:cover;
              border-radius:16px;
              display:block;
            "
          >
        </a>

        <div
          style="
            text-align:center;
            font-weight:700;
            margin-top:6px;
          "
        >
          Escolhida ${i + 1}
        </div>

      </div>
    `
  ).join('');
}


async function renderOrdersAdmin() {
  const [
    orders,
    galleries,
    finals
  ] = await Promise.all([
    getOrders(),
    getGalleries(),
    getFinalSelections()
  ]);

  const content =
    orders.length
      ?
      orders.map(o => {

        const gallery =
          galleries.find(
            g =>
              String(g.order_id) ===
              String(o.id)
          );

        const final =
          finals.find(
            f =>
              String(f.order_id) ===
              String(o.id)
          );

        return `
          <div class="adminCard">

            <div
              class="row"
              style="
                justify-content:
                  space-between;
              "
            >

              <div>
                <h3>
                  ${esc(o.client_name)}
                </h3>

                <p class="muted">
                  ${esc(o.phone)}
                  •
                  ${
                    esc(
                      o.category_name ||
                      o.category ||
                      ''
                    )
                  }
                </p>
              </div>

              <b>
                ${
                  Array.isArray(
                    o.selected_photos
                  )
                    ?
                    o.selected_photos.length
                    :
                    0
                }
                fotos
              </b>

            </div>

            <p>
              Status:
              <b>
                ${
                  esc(
                    o.status ||
                    'Nova seleção'
                  )
                }
              </b>
            </p>

            <p class="muted">
              ${
                esc(
                  o.note ||
                  'Sem observações'
                )
              }
            </p>

            <h3>
              Fotos escolhidas pela cliente
            </h3>

            <div
              style="
                display:flex;
                gap:12px;
                overflow-x:auto;
                padding-bottom:12px;
              "
            >
              ${
                orderPhotosHtml(
                  o.selected_photos
                )
              }
            </div>

            ${
              gallery
                ?
                `
                  <div
                    style="
                      margin-top:15px;
                      padding:14px;
                      background:#eee;
                      border-radius:16px;
                    "
                  >
                    <b>
                      Galeria publicada ✓
                    </b>

                    <p>
                      ${
                        gallery.photos
                          ?.length || 0
                      }
                      fotos prontas
                    </p>
                  </div>
                `
                :
                ''
            }

            ${
              final
                ?
                `
                  <div
                    style="
                      margin-top:15px;
                      padding:14px;
                      border:2px solid #111;
                      border-radius:16px;
                    "
                  >

                    <h3
                      style="
                        margin-top:0;
                      "
                    >
                      Seleção final recebida ✓
                    </h3>

                    <p>
                      <b>
                        ${
                          final
                            .selected_photos
                            ?.length || 0
                        }
                        fotos escolhidas
                      </b>
                    </p>

                    <div
                      style="
                        display:flex;
                        gap:12px;
                        overflow-x:auto;
                      "
                    >
                      ${
                        finalPhotosHtml(
                          final.selected_photos
                        )
                      }
                    </div>

                  </div>
                `
                :
                ''
            }

            <div
              class="row"
              style="
                margin-top:15px;
                flex-wrap:wrap;
              "
            >

              <button
                onclick="
                  readyGallery(
                    '${o.id}',
                    '${jsq(o.client_name)}'
                  )
                "
              >
                ${
                  gallery
                    ?
                    'Nova galeria'
                    :
                    'Criar galeria pronta'
                }
              </button>

              <button
                onclick="
                  copyClientLink(
                    '${o.id}'
                  )
                "
              >
                Copiar link
              </button>

            </div>

          </div>
        `;
      }).join('')
      :
      `
        <div class="adminCard">
          <h3>
            Nenhum pedido ainda
          </h3>

          <p class="muted">
            Os pedidos aparecerão aqui.
          </p>
        </div>
      `;

  adminLayout(
    'pedidos',
    'Pedidos',
    'Acompanhe as seleções das clientes.',
    content
  );
}

/* =========================================================
   NICHOS / ENSAIOS
========================================================= */

async function renderCategoriesAdmin() {
  const categories =
    await getAdminCategories();

  const withCounts =
    await Promise.all(
      categories.map(
        async category => {
          const {
            count
          } =
            await sb
              .from('category_photos')
              .select(
                'id',
                {
                  count: 'exact',
                  head: true
                }
              )
              .eq(
                'category_id',
                category.id
              );

          return {
            ...category,
            photo_count:
              count || 0
          };
        }
      )
    );

  const content = `
    <button
      class="primary"
      style="
        width:100%;
        margin-bottom:18px;
      "
      onclick="categoryForm()"
    >
      + Criar novo nicho
    </button>

    ${
      withCounts.length
        ?
        withCounts.map(c => `
          <div class="adminCard">

            <div
              style="
                display:grid;
                grid-template-columns:
                  95px 1fr;
                gap:14px;
                align-items:center;
              "
            >

              ${
                c.cover_url
                  ?
                  `
                    <img
                      src="${esc(c.cover_url)}"
                      style="
                        width:95px;
                        height:120px;
                        object-fit:cover;
                        border-radius:14px;
                      "
                    >
                  `
                  :
                  `
                    <div
                      style="
                        width:95px;
                        height:120px;
                        border-radius:14px;
                        background:#eee;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        text-align:center;
                      "
                    >
                      Sem capa
                    </div>
                  `
              }

              <div>

                <h3
                  style="
                    margin-top:0;
                    margin-bottom:4px;
                  "
                >
                  ${esc(c.name)}
                </h3>

                <p class="muted">
                  ${c.photo_count}
                  fotos
                </p>

                <p>
                  ${
                    c.active
                      ?
                      '<b>Ativo ✓</b>'
                      :
                      '<b>Desativado</b>'
                  }
                </p>

                <p class="muted">
                  Ordem:
                  ${c.sort_order}
                </p>

              </div>

            </div>

            <div
              class="row"
              style="
                flex-wrap:wrap;
                margin-top:15px;
              "
            >

              <button
                onclick="
                  categoryForm('${c.id}')
                "
              >
                Editar
              </button>

              <button
                onclick="
                  toggleCategory(
                    '${c.id}',
                    ${!c.active}
                  )
                "
              >
                ${
                  c.active
                    ?
                    'Desativar'
                    :
                    'Ativar'
                }
              </button>

              <button
                onclick="
                  moveCategory(
                    '${c.id}',
                    -1
                  )
                "
              >
                ↑ Subir
              </button>

              <button
                onclick="
                  moveCategory(
                    '${c.id}',
                    1
                  )
                "
              >
                ↓ Descer
              </button>

              <button
                onclick="
                  deleteCategory(
                    '${c.id}'
                  )
                "
              >
                Excluir
              </button>

            </div>

          </div>
        `).join('')
        :
        `
          <div class="adminCard">

            <h3>
              Nenhum nicho cadastrado.
            </h3>

            <p class="muted">
              Crie seu primeiro ensaio.
            </p>

          </div>
        `
    }
  `;

  adminLayout(
    'nichos',
    'Nichos / Ensaios',
    'Crie, edite e organize seus ensaios.',
    content
  );
}


async function categoryForm(categoryId = null) {
  const allowed =
    await requireAdmin();

  if (!allowed) return;

  state.coverFile = null;
  state.coverPreview = null;

  state.categoryFiles = [];
  state.categoryPreviews = [];

  let category = {
    id: null,
    name: '',
    description: '',
    cover_url: '',
    active: true,
    sort_order: 0
  };

  let photos = [];

  if (categoryId) {
    const [
      categoryResult,
      photosResult
    ] = await Promise.all([

      sb
        .from('categories')
        .select('*')
        .eq(
          'id',
          Number(categoryId)
        )
        .single(),

      sb
        .from('category_photos')
        .select('*')
        .eq(
          'category_id',
          Number(categoryId)
        )
        .order(
          'sort_order',
          { ascending: true }
        )
    ]);

    if (
      categoryResult.error ||
      !categoryResult.data
    ) {
      toast(
        'Não foi possível carregar o nicho.'
      );
      return;
    }

    category =
      categoryResult.data;

    photos =
      photosResult.data || [];
  }

  window.editingCategoryPhotos =
    photos;

  app.innerHTML = `
    <div
      class="wrap"
      style="max-width:760px;"
    >

      <button
        onclick="
          adminPage('nichos')
        "
      >
        ← Voltar
      </button>

      <div class="hero">

        <p class="muted">
          NICHOS / ENSAIOS
        </p>

        <h1>
          ${
            categoryId
              ?
              'Editar nicho'
              :
              'Novo nicho'
          }
        </h1>

      </div>

      <div class="adminCard">

        <label>
          Nome do nicho
        </label>

        <input
          id="catName"
          class="input"
          value="${esc(category.name)}"
          placeholder="Ex.: Gestante"
        >

        <label>
          Descrição
        </label>

        <textarea
          id="catDescription"
          class="input"
          rows="4"
          placeholder="Descrição do ensaio"
        >${esc(category.description || '')}</textarea>

        <label>
          Ordem
        </label>

        <input
          id="catOrder"
          class="input"
          type="number"
          value="${Number(category.sort_order || 0)}"
        >

        <label
          style="
            display:flex;
            align-items:center;
            gap:10px;
            margin:12px 0;
          "
        >
          <input
            id="catActive"
            type="checkbox"
            ${
              category.active
                ?
                'checked'
                :
                ''
            }
          >
          Nicho ativo
        </label>

      </div>


      <div class="adminCard">

        <h2>
          Foto de capa
        </h2>

        ${
          category.cover_url
            ?
            `
              <img
                id="oldCover"
                src="${esc(category.cover_url)}"
                style="
                  width:100%;
                  max-height:360px;
                  object-fit:cover;
                  border-radius:16px;
                  margin-bottom:14px;
                "
              >
            `
            :
            ''
        }

        <input
          type="file"
          accept="image/*"
          onchange="
            handleCoverFile(this)
          "
        >

        <div
          id="coverPreview"
          style="margin-top:12px;"
        ></div>

      </div>


      ${
        categoryId
          ?
          `
            <div class="adminCard">

              <h2>
                Fotos cadastradas
              </h2>

              <p class="muted">
                ${photos.length}
                fotos
              </p>

              <div
                style="
                  display:grid;
                  grid-template-columns:
                    repeat(2,minmax(0,1fr));
                  gap:12px;
                "
              >

                ${photos.map(photo => `
                  <div
                    style="
                      position:relative;
                    "
                  >

                    <img
                      src="${esc(photo.photo_url)}"
                      style="
                        width:100%;
                        aspect-ratio:4/5;
                        object-fit:cover;
                        border-radius:14px;
                      "
                    >

                    <button
                      onclick="
                        deleteCategoryPhoto(
                          '${photo.id}',
                          '${jsq(photo.photo_url)}',
                          '${category.id}'
                        )
                      "
                      style="
                        position:absolute;
                        right:7px;
                        top:7px;
                      "
                    >
                      ×
                    </button>

                  </div>
                `).join('')}

              </div>

            </div>
          `
          :
          ''
      }


      <div class="adminCard">

        <h2>
          ${
            categoryId
              ?
              'Adicionar mais fotos'
              :
              'Fotos do ensaio'
          }
        </h2>

        <input
          type="file"
          accept="image/*"
          multiple
          onchange="
            handleCategoryFiles(this)
          "
        >

        <p>
          <b id="categoryFileCount">
            0 fotos selecionadas
          </b>
        </p>

        <div
          id="categoryUploadPreview"
          style="
            display:grid;
            grid-template-columns:
              repeat(2,minmax(0,1fr));
            gap:12px;
          "
        ></div>

      </div>


      <div
        id="categoryProgress"
        class="adminCard"
        style="display:none;"
      >
        <b id="categoryProgressText">
          Preparando...
        </b>
      </div>


      <button
        class="primary"
        style="
          width:100%;
          margin-bottom:70px;
        "
        onclick="
          saveCategory(
            ${
              categoryId
                ?
                `'${category.id}'`
                :
                'null'
            },
            '${jsq(category.cover_url || '')}'
          )
        "
      >
        ${
          categoryId
            ?
            'Salvar alterações'
            :
            'Criar nicho'
        }
      </button>

    </div>
  `;
}


function handleCoverFile(input) {
  const file =
    input.files?.[0];

  if (!file) return;

  state.coverFile = file;

  if (
    state.coverPreview
  ) {
    URL.revokeObjectURL(
      state.coverPreview
    );
  }

  state.coverPreview =
    URL.createObjectURL(file);

  const box =
    document.querySelector(
      '#coverPreview'
    );

  if (box) {
    box.innerHTML = `
      <img
        src="${state.coverPreview}"
        style="
          width:100%;
          max-height:360px;
          object-fit:cover;
          border-radius:16px;
        "
      >
    `;
  }
}


function handleCategoryFiles(input) {
  state.categoryPreviews
    .forEach(url =>
      URL.revokeObjectURL(url)
    );

  state.categoryFiles =
    Array.from(
      input.files || []
    );

  state.categoryPreviews =
    state.categoryFiles.map(
      file =>
        URL.createObjectURL(file)
    );

  renderCategoryFilePreviews();
}


function renderCategoryFilePreviews() {
  const box =
    document.querySelector(
      '#categoryUploadPreview'
    );

  const count =
    document.querySelector(
      '#categoryFileCount'
    );

  if (count) {
    count.textContent =
      `${state.categoryFiles.length} fotos selecionadas`;
  }

  if (!box) return;

  box.innerHTML =
    state.categoryPreviews.map(
      (url, i) => `
        <div
          style="
            position:relative;
          "
        >

          <img
            src="${url}"
            style="
              width:100%;
              aspect-ratio:4/5;
              object-fit:cover;
              border-radius:14px;
            "
          >

          <button
            onclick="
              removeCategoryFile(${i})
            "
            style="
              position:absolute;
              top:7px;
              right:7px;
            "
          >
            ×
          </button>

        </div>
      `
    ).join('');
}


function removeCategoryFile(index) {
  const preview =
    state.categoryPreviews[index];

  if (preview) {
    URL.revokeObjectURL(preview);
  }

  state.categoryFiles.splice(
    index,
    1
  );

  state.categoryPreviews.splice(
    index,
    1
  );

  renderCategoryFilePreviews();
}


async function uploadSelectionFile(
  file,
  pathPrefix
) {
  const path =
    `${pathPrefix}/${randomId()}-${safeFileName(file.name)}`;

  const {
    error
  } =
    await sb
      .storage
      .from('fotos-selecao')
      .upload(
        path,
        file,
        {
          cacheControl: '3600',
          upsert: false
        }
      );

  if (error) {
    throw error;
  }

  const {
    data
  } =
    sb
      .storage
      .from('fotos-selecao')
      .getPublicUrl(path);

  return data.publicUrl;
}


async function saveCategory(
  categoryId,
  oldCover
) {
  const name =
    document
      .querySelector('#catName')
      .value
      .trim();

  const description =
    document
      .querySelector(
        '#catDescription'
      )
      .value
      .trim();

  const sortOrder =
    Number(
      document
        .querySelector(
          '#catOrder'
        )
        .value || 0
    );

  const active =
    document
      .querySelector(
        '#catActive'
      )
      .checked;

  if (!name) {
    toast(
      'Informe o nome do nicho.'
    );
    return;
  }

  const progressBox =
    document.querySelector(
      '#categoryProgress'
    );

  const progressText =
    document.querySelector(
      '#categoryProgressText'
    );

  if (progressBox) {
    progressBox.style.display =
      'block';
  }

  let id =
    categoryId
      ?
      Number(categoryId)
      :
      null;

  try {

    if (!id) {
      if (progressText) {
        progressText.textContent =
          'Criando nicho...';
      }

      const {
        data,
        error
      } =
        await sb
          .from('categories')
          .insert({
            name,
            description,
            active,
            sort_order:
              sortOrder
          })
          .select()
          .single();

      if (error) {
        throw error;
      }

      id = data.id;
    }


    let coverUrl =
      oldCover || '';

    if (state.coverFile) {
      if (progressText) {
        progressText.textContent =
          'Enviando capa...';
      }

      coverUrl =
        await uploadSelectionFile(
          state.coverFile,
          `categories/${id}/cover`
        );
    }


    const {
      error:
      updateError
    } =
      await sb
        .from('categories')
        .update({
          name,
          description,
          cover_url:
            coverUrl || null,
          active,
          sort_order:
            sortOrder
        })
        .eq('id', id);

    if (updateError) {
      throw updateError;
    }


    if (
      state.categoryFiles.length
    ) {
      const {
        data:
        existingPhotos
      } =
        await sb
          .from('category_photos')
          .select('sort_order')
          .eq(
            'category_id',
            id
          )
          .order(
            'sort_order',
            { ascending: false }
          )
          .limit(1);

      let nextOrder =
        existingPhotos?.length
          ?
          Number(
            existingPhotos[0]
              .sort_order || 0
          ) + 1
          :
          0;

      for (
        let i = 0;
        i <
        state.categoryFiles.length;
        i++
      ) {
        const file =
          state.categoryFiles[i];

        if (progressText) {
          progressText.textContent =
            `Enviando foto ${i + 1} de ${state.categoryFiles.length}...`;
        }

        const photoUrl =
          await uploadSelectionFile(
            file,
            `categories/${id}/photos`
          );

        const {
          error:
          insertError
        } =
          await sb
            .from('category_photos')
            .insert({
              category_id: id,
              photo_url:
                photoUrl,
              file_name:
                file.name,
              sort_order:
                nextOrder
            });

        if (insertError) {
          throw insertError;
        }

        nextOrder++;
      }
    }


    toast(
      'Nicho salvo com sucesso!'
    );

    await renderCategoriesAdmin();

  } catch (error) {
    console.error(error);

    toast(
      'Erro: ' +
      (
        error.message ||
        'não foi possível salvar.'
      )
    );
  }
}


async function toggleCategory(
  categoryId,
  active
) {
  const {
    error
  } =
    await sb
      .from('categories')
      .update({
        active
      })
      .eq(
        'id',
        Number(categoryId)
      );

  if (error) {
    toast(
      'Erro ao alterar nicho.'
    );
    return;
  }

  await renderCategoriesAdmin();
}


async function moveCategory(
  categoryId,
  direction
) {
  const categories =
    await getAdminCategories();

  const index =
    categories.findIndex(
      c =>
        Number(c.id) ===
        Number(categoryId)
    );

  if (index < 0) return;

  const otherIndex =
    index + Number(direction);

  if (
    otherIndex < 0 ||
    otherIndex >=
    categories.length
  ) {
    return;
  }

  const current =
    categories[index];

  const other =
    categories[otherIndex];

  let currentOrder =
    Number(
      current.sort_order || 0
    );

  let otherOrder =
    Number(
      other.sort_order || 0
    );

  if (
    currentOrder ===
    otherOrder
  ) {
    currentOrder = index;
    otherOrder = otherIndex;
  }

  await Promise.all([
    sb
      .from('categories')
      .update({
        sort_order:
          otherOrder
      })
      .eq(
        'id',
        current.id
      ),

    sb
      .from('categories')
      .update({
        sort_order:
          currentOrder
      })
      .eq(
        'id',
        other.id
      )
  ]);

  await renderCategoriesAdmin();
}


async function deleteCategoryPhoto(
  photoId,
  photoUrl,
  categoryId
) {
  const yes =
    confirm(
      'Excluir esta foto do nicho?'
    );

  if (!yes) return;

  const path =
    publicStoragePath(
      photoUrl,
      'fotos-selecao'
    );

  if (path) {
    await sb
      .storage
      .from('fotos-selecao')
      .remove([path]);
  }

  const {
    error
  } =
    await sb
      .from('category_photos')
      .delete()
      .eq(
        'id',
        Number(photoId)
      );

  if (error) {
    toast(
      'Erro ao excluir foto.'
    );
    return;
  }

  toast('Foto excluída.');

  await categoryForm(
    Number(categoryId)
  );
}


async function deleteCategory(
  categoryId
) {
  const yes =
    confirm(
      'Excluir este nicho e todas as referências de fotos?'
    );

  if (!yes) return;

  const {
    data: category
  } =
    await sb
      .from('categories')
      .select('*')
      .eq(
        'id',
        Number(categoryId)
      )
      .single();

  const {
    data: photos
  } =
    await sb
      .from('category_photos')
      .select('*')
      .eq(
        'category_id',
        Number(categoryId)
      );

  const paths = [];

  if (category?.cover_url) {
    const p =
      publicStoragePath(
        category.cover_url,
        'fotos-selecao'
      );

    if (p) {
      paths.push(p);
    }
  }

  (photos || []).forEach(photo => {
    const p =
      publicStoragePath(
        photo.photo_url,
        'fotos-selecao'
      );

    if (p) {
      paths.push(p);
    }
  });

  if (paths.length) {
    await sb
      .storage
      .from('fotos-selecao')
      .remove(paths);
  }

  const {
    error
  } =
    await sb
      .from('categories')
      .delete()
      .eq(
        'id',
        Number(categoryId)
      );

  if (error) {
    toast(
      'Erro ao excluir nicho.'
    );
    return;
  }

  toast('Nicho excluído.');

  await renderCategoriesAdmin();
}


/* =========================================================
   GALERIA PRONTA
========================================================= */

function readyGallery(
  orderId,
  clientName
) {
  state.readyPreviews.forEach(
    url =>
      URL.revokeObjectURL(url)
  );

  state.readyFiles = [];
  state.readyPreviews = [];

  app.innerHTML = `
    <div
      class="wrap"
      style="max-width:760px;"
    >

      <button
        onclick="
          adminPage('pedidos')
        "
      >
        ← Voltar
      </button>

      <div class="hero">

        <p class="muted">
          GALERIA PRONTA
        </p>

        <h1>
          ${esc(clientName)}
        </h1>

        <p class="muted">
          Envie as fotos já editadas,
          configure a marca-d’água
          e publique.
        </p>

      </div>


      <div class="adminCard">

        <h2>
          1. Fotos prontas
        </h2>

        <input
          type="file"
          accept="image/*"
          multiple
          onchange="
            handleReadyFiles(this)
          "
        >

        <p>
          <b id="readyFileCount">
            0 fotos selecionadas
          </b>
        </p>

        <div
          id="readyUploadPreview"
          style="
            display:grid;
            grid-template-columns:
              repeat(2,minmax(0,1fr));
            gap:12px;
          "
        ></div>

      </div>


      <div class="adminCard">

        <h2>
          2. Marca-d’água
        </h2>

        <label>
          Texto
        </label>

        <input
          id="wmText"
          class="input"
          value="${esc(cfg.studioName || 'Fotoflow')}"
          oninput="
            updateWatermarkPreview()
          "
        >


        <label>
          Estilo
        </label>

        <select
          id="wmPreset"
          class="input"
          onchange="
            applyWatermarkPreset()
          "
        >
          <option value="repeat">
            Repetida
          </option>

          <option value="center">
            Centralizada
          </option>

          <option value="diagonal">
            Diagonal
          </option>
        </select>


        <label>
          Quantidade de marcas
        </label>

        <input
          id="wmRepeat"
          type="range"
          min="1"
          max="15"
          value="6"
          oninput="
            document
              .querySelector(
                '#wmRepeatValue'
              )
              .textContent =
              this.value;
            updateWatermarkPreview();
          "
          style="width:100%;"
        >

        <p>
          Quantidade:
          <b id="wmRepeatValue">
            6
          </b>
        </p>


        <label>
          Transparência
        </label>

        <input
          id="wmOpacity"
          type="range"
          min="10"
          max="90"
          value="35"
          oninput="
            document
              .querySelector(
                '#wmOpacityValue'
              )
              .textContent =
              this.value + '%';
            updateWatermarkPreview();
          "
          style="width:100%;"
        >

        <p>
          Transparência:
          <b id="wmOpacityValue">
            35%
          </b>
        </p>


        <label>
          Tamanho
        </label>

        <input
          id="wmSize"
          type="range"
          min="18"
          max="80"
          value="32"
          oninput="
            document
              .querySelector(
                '#wmSizeValue'
              )
              .textContent =
              this.value;
            updateWatermarkPreview();
          "
          style="width:100%;"
        >

        <p>
          Tamanho:
          <b id="wmSizeValue">
            32
          </b>
        </p>


        <label>
          Rotação
        </label>

        <input
          id="wmRotation"
          type="range"
          min="-60"
          max="60"
          value="-25"
          oninput="
            document
              .querySelector(
                '#wmRotationValue'
              )
              .textContent =
              this.value + '°';
            updateWatermarkPreview();
          "
          style="width:100%;"
        >

        <p>
          Rotação:
          <b id="wmRotationValue">
            -25°
          </b>
        </p>

      </div>


      <div class="adminCard">

        <h2>
          Pré-visualização
        </h2>

        <div id="watermarkPreview">
          <p class="muted">
            Selecione uma foto pronta
            para visualizar.
          </p>
        </div>

      </div>


      <button
        class="primary"
        style="
          width:100%;
          margin-bottom:80px;
        "
        onclick="
          publishReadyGallery(
            '${orderId}',
            '${jsq(clientName)}'
          )
        "
      >
        Publicar galeria
      </button>

    </div>
  `;
      }

function handleReadyFiles(input) {
  state.readyPreviews.forEach(
    url =>
      URL.revokeObjectURL(url)
  );

  state.readyFiles =
    Array.from(
      input.files || []
    );

  state.readyPreviews =
    state.readyFiles.map(
      file =>
        URL.createObjectURL(file)
    );

  renderReadyPreviews();
  updateWatermarkPreview();
}


function renderReadyPreviews() {
  const box =
    document.querySelector(
      '#readyUploadPreview'
    );

  const count =
    document.querySelector(
      '#readyFileCount'
    );

  if (count) {
    count.textContent =
      `${state.readyFiles.length} fotos selecionadas`;
  }

  if (!box) return;

  box.innerHTML =
    state.readyPreviews.map(
      (url, i) => `
        <div
          style="
            position:relative;
          "
        >
          <img
            src="${url}"
            style="
              width:100%;
              aspect-ratio:4/5;
              object-fit:cover;
              border-radius:14px;
            "
          >

          <button
            onclick="
              removeReadyFile(${i})
            "
            style="
              position:absolute;
              top:7px;
              right:7px;
            "
          >
            ×
          </button>
        </div>
      `
    ).join('');
}


function removeReadyFile(index) {
  const url =
    state.readyPreviews[index];

  if (url) {
    URL.revokeObjectURL(url);
  }

  state.readyFiles.splice(
    index,
    1
  );

  state.readyPreviews.splice(
    index,
    1
  );

  renderReadyPreviews();
  updateWatermarkPreview();
}


function getWatermarkConfig() {
  return {
    text:
      document
        .querySelector('#wmText')
        ?.value
        ?.trim()
      ||
      cfg.studioName
      ||
      'Fotoflow',

    repeat:
      Number(
        document
          .querySelector(
            '#wmRepeat'
          )
          ?.value || 6
      ),

    opacity:
      Number(
        document
          .querySelector(
            '#wmOpacity'
          )
          ?.value || 35
      ) / 100,

    size:
      Number(
        document
          .querySelector(
            '#wmSize'
          )
          ?.value || 32
      ),

    rotation:
      Number(
        document
          .querySelector(
            '#wmRotation'
          )
          ?.value || -25
      )
  };
}


function applyWatermarkPreset() {
  const preset =
    document
      .querySelector(
        '#wmPreset'
      )
      .value;

  const repeat =
    document.querySelector(
      '#wmRepeat'
    );

  const rotation =
    document.querySelector(
      '#wmRotation'
    );

  if (preset === 'center') {
    repeat.value = 1;
    rotation.value = 0;
  }

  if (preset === 'diagonal') {
    repeat.value = 1;
    rotation.value = -25;
  }

  if (preset === 'repeat') {
    repeat.value = 6;
    rotation.value = -25;
  }

  document
    .querySelector(
      '#wmRepeatValue'
    )
    .textContent =
    repeat.value;

  document
    .querySelector(
      '#wmRotationValue'
    )
    .textContent =
    rotation.value + '°';

  updateWatermarkPreview();
}


function watermarkLayerFromConfig(
  config
) {
  const repeat =
    Math.max(
      1,
      Math.min(
        15,
        Number(config.repeat || 1)
      )
    );

  return `
    <div
      style="
        position:absolute;
        inset:0;
        pointer-events:none;
        overflow:hidden;
      "
    >
      ${
        Array
          .from({
            length: repeat
          })
          .map(
            (_, i) => {

              const top =
                repeat === 1
                  ?
                  46
                  :
                  7 +
                  (
                    i *
                    86 /
                    repeat
                  );

              const left =
                repeat === 1
                  ?
                  50
                  :
                  (
                    i * 31
                  ) % 68;

              const transform =
                repeat === 1
                  ?
                  `translate(-50%,-50%) rotate(${config.rotation}deg)`
                  :
                  `rotate(${config.rotation}deg)`;

              return `
                <div
                  style="
                    position:absolute;
                    top:${top}%;
                    left:${left}%;
                    transform:${transform};
                    font-size:${Number(config.size)}px;
                    font-weight:800;
                    color:white;
                    opacity:${Number(config.opacity)};
                    text-shadow:
                      0 2px 6px
                      rgba(0,0,0,.6);
                    white-space:nowrap;
                  "
                >
                  ${esc(config.text)}
                </div>
              `;
            }
          )
          .join('')
      }
    </div>
  `;
}


function updateWatermarkPreview() {
  const box =
    document.querySelector(
      '#watermarkPreview'
    );

  if (!box) return;

  if (
    !state.readyPreviews.length
  ) {
    box.innerHTML = `
      <p class="muted">
        Selecione uma foto pronta
        para visualizar.
      </p>
    `;

    return;
  }

  const config =
    getWatermarkConfig();

  box.innerHTML = `
    <div
      style="
        position:relative;
        overflow:hidden;
        border-radius:16px;
      "
    >

      <img
        src="${state.readyPreviews[0]}"
        style="
          width:100%;
          display:block;
          max-height:540px;
          object-fit:cover;
        "
      >

      ${
        watermarkLayerFromConfig(
          config
        )
      }

    </div>
  `;
}


async function publishReadyGallery(
  orderId,
  clientName
) {
  if (
    !state.readyFiles.length
  ) {
    toast(
      'Adicione pelo menos uma foto pronta.'
    );
    return;
  }

  const wm =
    getWatermarkConfig();

  toast('Enviando fotos...');

  const urls = [];

  for (
    let i = 0;
    i < state.readyFiles.length;
    i++
  ) {
    const file =
      state.readyFiles[i];

    const path =
      `${orderId}/${randomId()}-${safeFileName(file.name)}`;

    const {
      error:
      uploadError
    } =
      await publicSb
        .storage
        .from('fotos-prontas')
        .upload(
          path,
          file,
          {
            cacheControl:
              '3600',
            upsert: false
          }
        );

    if (uploadError) {
      console.error(uploadError);

      toast(
        'Erro no upload: ' +
        uploadError.message
      );

      return;
    }

    const {
      data
    } =
      publicSb
        .storage
        .from('fotos-prontas')
        .getPublicUrl(path);

    urls.push(
      data.publicUrl
    );
  }


  const {
    data:
    galleryData,
    error:
    galleryError
  } =
    await publicSb
      .from('galleries')
      .insert({
        order_id:
          Number(orderId),

        client_name:
          clientName,

        watermark_text:
          wm.text,

        watermark_opacity:
          wm.opacity,

        watermark_size:
          wm.size,

        watermark_rotation:
          wm.rotation,

        watermark_repeat:
          wm.repeat,

        photos:
          urls,

        status:
          'Publicada'
      })
      .select()
      .single();

  if (
    galleryError ||
    !galleryData
  ) {
    console.error(
      galleryError
    );

    toast(
      'Erro ao criar galeria: ' +
      (
        galleryError?.message ||
        ''
      )
    );

    return;
  }


  const url =
    location.origin +
    location.pathname +
    '#galeria=' +
    galleryData.id;

  try {
    await navigator
      .clipboard
      .writeText(url);
  } catch (e) {}


  app.innerHTML = `
    <div
      class="wrap"
      style="
        max-width:650px;
        text-align:center;
        padding-top:70px;
      "
    >

      <h1>
        Galeria publicada! ✓
      </h1>

      <p class="muted">
        O link da cliente
        já está pronto.
      </p>

      <input
        class="input"
        value="${esc(url)}"
        readonly
      >

      <button
        class="primary"
        style="width:100%;"
        onclick="
          navigator
            .clipboard
            .writeText(
              '${jsq(url)}'
            );
          toast(
            'Link copiado!'
          );
        "
      >
        Copiar link
      </button>

      <br><br>

      <button
        onclick="
          adminPage('pedidos')
        "
      >
        Voltar ao painel
      </button>

    </div>
  `;
}


/* =========================================================
   LISTA DE GALERIAS
========================================================= */

async function renderGalleriesAdmin() {
  const galleries =
    await getGalleries();

  const content =
    galleries.length
      ?
      galleries.map(g => {

        const url =
          location.origin +
          location.pathname +
          '#galeria=' +
          g.id;

        return `
          <div class="adminCard">

            <h3>
              ${
                esc(
                  g.client_name ||
                  'Cliente'
                )
              }
            </h3>

            <p>
              <b>
                ${
                  g.photos
                    ?.length || 0
                }
                fotos
              </b>
            </p>

            <p class="muted">
              Marca-d’água:
              ${
                esc(
                  g.watermark_text ||
                  ''
                )
              }
            </p>

            <button
              onclick="
                navigator
                  .clipboard
                  .writeText(
                    '${jsq(url)}'
                  );
                toast(
                  'Link copiado!'
                );
              "
            >
              Copiar link
            </button>

          </div>
        `;
      }).join('')
      :
      `
        <div class="adminCard">
          <h3>
            Nenhuma galeria publicada.
          </h3>
        </div>
      `;

  adminLayout(
    'galerias',
    'Galerias prontas',
    'Galerias já publicadas para clientes.',
    content
  );
}


async function copyClientLink(
  orderId
) {
  const {
    data,
    error
  } =
    await publicSb
      .from('galleries')
      .select('*')
      .eq(
        'order_id',
        Number(orderId)
      )
      .order(
        'created_at',
        { ascending: false }
      )
      .limit(1);

  if (
    error ||
    !data?.length
  ) {
    toast(
      'Crie a galeria pronta primeiro.'
    );
    return;
  }

  const gallery =
    data[0];

  const url =
    location.origin +
    location.pathname +
    '#galeria=' +
    gallery.id;

  try {
    await navigator
      .clipboard
      .writeText(url);

    toast(
      'Link da cliente copiado!'
    );
  } catch (e) {
    prompt(
      'Copie este link:',
      url
    );
  }
}


/* =========================================================
   SELEÇÕES FINAIS ADMIN
========================================================= */

async function renderFinalSelectionsAdmin() {
  const finals =
    await getFinalSelections();

  const orders =
    await getOrders();

  const content =
    finals.length
      ?
      finals.map(f => {

        const order =
          orders.find(
            o =>
              String(o.id) ===
              String(f.order_id)
          );

        return `
          <div class="adminCard">

            <h3>
              ${
                esc(
                  order?.client_name ||
                  'Cliente'
                )
              }
            </h3>

            <p class="muted">
              ${
                esc(
                  order?.phone ||
                  ''
                )
              }
            </p>

            <p>
              <b>
                ${
                  f.selected_photos
                    ?.length || 0
                }
                fotos escolhidas
              </b>
            </p>

            <div
              style="
                display:flex;
                gap:12px;
                overflow-x:auto;
              "
            >
              ${
                finalPhotosHtml(
                  f.selected_photos
                )
              }
            </div>

          </div>
        `;
      }).join('')
      :
      `
        <div class="adminCard">
          <h3>
            Nenhuma seleção final ainda.
          </h3>
        </div>
      `;

  adminLayout(
    'finais',
    'Seleções finais',
    'Veja exatamente quais fotos cada cliente escolheu.',
    content
  );
}


/* =========================================================
   GALERIA FINAL DA CLIENTE
========================================================= */

function watermarkLayer(g) {
  return watermarkLayerFromConfig({
    text:
      g.watermark_text ||
      cfg.studioName ||
      'Fotoflow',

    repeat:
      g.watermark_repeat || 6,

    opacity:
      g.watermark_opacity || 0.35,

    size:
      g.watermark_size || 32,

    rotation:
      g.watermark_rotation || -25
  });
}


async function clientReady(id) {
  const {
    data: gallery,
    error
  } =
    await publicSb
      .from('galleries')
      .select('*')
      .eq(
        'id',
        Number(id)
      )
      .single();

  if (
    error ||
    !gallery
  ) {
    app.innerHTML = `
      <div class="wrap">
        <h2>
          Galeria não encontrada.
        </h2>
      </div>
    `;

    return;
  }

  state.finalSelected = [];

  app.innerHTML = `
    <div class="wrap">

      <div class="hero">

        <p class="muted">
          FOTOS PRONTAS
          •
          ${
            esc(
              gallery.client_name ||
              ''
            )
          }
        </p>

        <h1>
          Escolha suas favoritas.
        </h1>

        <p class="muted">
          As prévias possuem
          marca-d’água.
          Toque nas fotos
          para selecionar.
        </p>

      </div>

      <div class="grid">

        ${
          (gallery.photos || [])
            .map(
              (photoUrl, i) => `
                <div
                  class="photoWrap card"
                  id="final-${i}"
                  onclick="
                    pickFinal(${i})
                  "
                  style="
                    position:relative;
                    overflow:hidden;
                  "
                >

                  <img
                    class="photo"
                    src="${esc(photoUrl)}"
                  >

                  ${
                    watermarkLayer(
                      gallery
                    )
                  }

                  <span
                    class="badge"
                    style="display:none;"
                  >
                    ✓ Selecionada
                  </span>

                </div>
              `
            )
            .join('')
        }

      </div>

    </div>

    <div class="bar">

      <b>
        <span id="finalCount">
          0
        </span>
        selecionadas
      </b>

      <button
        class="primary"
        onclick="
          sendFinalSelection(
            '${gallery.id}',
            '${gallery.order_id}'
          )
        "
      >
        Enviar seleção final
      </button>

    </div>
  `;

  window.currentReadyGallery =
    gallery;
}


function pickFinal(index) {
  const position =
    state.finalSelected
      .indexOf(index);

  if (position < 0) {
    state.finalSelected.push(
      index
    );
  } else {
    state.finalSelected.splice(
      position,
      1
    );
  }

  const selected =
    state.finalSelected
      .includes(index);

  const el =
    document.querySelector(
      '#final-' + index
    );

  if (el) {
    el.classList.toggle(
      'selected',
      selected
    );

    const badge =
      el.querySelector('.badge');

    if (badge) {
      badge.style.display =
        selected
          ?
          'block'
          :
          'none';
    }
  }

  const count =
    document.querySelector(
      '#finalCount'
    );

  if (count) {
    count.textContent =
      state.finalSelected.length;
  }
}


async function sendFinalSelection(
  galleryId,
  orderId
) {
  if (
    !state.finalSelected.length
  ) {
    toast(
      'Selecione pelo menos uma foto.'
    );
    return;
  }

  const gallery =
    window.currentReadyGallery;

  if (!gallery) {
    toast(
      'Galeria não carregada.'
    );
    return;
  }

  const selectedUrls =
    state.finalSelected
      .map(
        index =>
          gallery.photos[index]
      )
      .filter(Boolean);

  const {
    error
  } =
    await publicSb
      .from('final_selections')
      .insert({
        gallery_id:
          Number(galleryId),

        order_id:
          Number(orderId),

        selected_photos:
          selectedUrls
      });

  if (error) {
    console.error(error);

    toast(
      'Erro ao enviar seleção: ' +
      error.message
    );

    return;
  }

  app.innerHTML = `
    <div
      class="wrap"
      style="
        max-width:650px;
        text-align:center;
        padding-top:90px;
      "
    >

      <h1>
        Seleção final enviada! ✓
      </h1>

      <p class="muted">
        Suas fotos favoritas
        foram enviadas ao estúdio.
      </p>

    </div>
  `;
}


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

const adminBtn =
  document.querySelector(
    '#adminBtn'
  );

if (adminBtn) {
  adminBtn.onclick =
    admin;
}

const galleryHash =
  location.hash.match(
    /galeria=([^&]+)/
  );

if (galleryHash) {
  clientReady(
    galleryHash[1]
  );
} else {
  home();
            }

const cfg = window.FOTOFLOW_CONFIG;
const app = document.querySelector('#app');

let sb = null;

let state = {
  selected: [],
  admin: false,
  uploadFiles: [],
  uploadPreviews: []
};

if (cfg.supabaseUrl && cfg.supabaseAnonKey) {
  sb = supabase.createClient(
    cfg.supabaseUrl,
    cfg.supabaseAnonKey
  );
}

const demoCats = [
  {
    id: 'aniversario',
    name: 'Aniversário',
    desc: 'Fotos marcantes para comemorar seu dia.',
    cover: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'jardim',
    name: 'Jardim',
    desc: 'Ensaio leve, elegante e natural.',
    cover: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'elegante',
    name: 'Elegante',
    desc: 'Retratos sofisticados e premium.',
    cover: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80'
  }
];

const demoPhotos = [
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=700&q=80',
  'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=700&q=80',
  'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=700&q=80',
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=700&q=80'
];

function toast(text) {
  const x = document.querySelector('#toast');
  if (!x) return alert(text);

  x.textContent = text;
  x.style.display = 'block';

  setTimeout(() => {
    x.style.display = 'none';
  }, 2500);
}

function home() {
  state.selected = [];

  app.innerHTML = `
    <div class="wrap">

      <section class="hero">
        <p class="muted">ESCOLHA SEU ESTILO</p>
        <h1>Seu ensaio começa aqui.</h1>

        <p class="muted">
          Escolha uma categoria,
          marque suas fotos favoritas
          e envie sua seleção.
        </p>
      </section>

      <div class="grid">

        ${demoCats.map(c => `
          <article class="card">

            <img class="cover" src="${c.cover}">

            <div class="pad">

              <h2>${c.name}</h2>

              <p class="muted">
                ${c.desc}
              </p>

              <button
                class="primary"
                onclick="gallery('${c.id}','${c.name}')"
              >
                Ver fotos
              </button>

            </div>

          </article>
        `).join('')}

      </div>

    </div>
  `;
}

function gallery(id, name) {

  state.selected = [];

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
          ${name}
        </h1>

        <p>
          Toque nas fotos que deseja.
        </p>

      </div>

      <div class="grid">

        ${demoPhotos.map((p, i) => `

          <div
            class="photoWrap card"
            id="p${i}"
            onclick="pick(${i})"
          >

            <img
              class="photo"
              src="${p}"
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

    </div>

    <div class="bar">

      <b>
        <span id="count">0</span>
        selecionadas
      </b>

      <button
        class="primary"
        onclick="checkout('${id}','${name}')"
      >
        Continuar →
      </button>

    </div>
  `;
}

function pick(i) {

  const index = state.selected.indexOf(i);

  if (index < 0) {
    state.selected.push(i);
  } else {
    state.selected.splice(index, 1);
  }

  const el = document.querySelector('#p' + i);

  if (!el) return;

  const selected =
    state.selected.includes(i);

  el.classList.toggle(
    'selected',
    selected
  );

  const badge =
    el.querySelector('.badge');

  if (badge) {
    badge.style.display =
      selected ? 'block' : 'none';
  }

  const count =
    document.querySelector('#count');

  if (count) {
    count.textContent =
      state.selected.length;
  }
}

function checkout(id, name) {

  if (!state.selected.length) {
    return toast(
      'Selecione pelo menos uma foto.'
    );
  }

  app.innerHTML = `

    <div
      class="wrap"
      style="max-width:620px"
    >

      <button
        onclick="gallery('${id}','${name}')"
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
        style="width:100%"
        onclick="sendOrder('${id}','${name}')"
      >
        Enviar minhas escolhas
      </button>

    </div>
  `;
}

async function sendOrder(id, name) {

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

    return toast(
      'Preencha nome e WhatsApp.'
    );
  }

  const order = {

    client_name: client,

    phone,

    category: id,

    category_name: name,

    selected_photos:
      state.selected,

    note,

    status:
      'Nova seleção'
  };

  const { error } =
    await sb
      .from('orders')
      .insert(order);

  if (error) {

    return toast(
      'Erro ao enviar: ' +
      error.message
    );
  }

  app.innerHTML = `

    <div
      class="wrap"
      style="
        max-width:650px;
        text-align:center;
        padding-top:90px
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

async function admin() {

  const pass =
    prompt(
      'Senha do administrador:'
    );

  if (
    pass !==
    cfg.adminPassword
  ) {

    return toast(
      'Senha incorreta.'
    );
  }

  state.admin = true;

  renderAdmin();
}

async function getOrders() {

  const {
    data,
    error
  } =
    await sb
      .from('orders')
      .select('*')
      .order(
        'created_at',
        { ascending:false }
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
    await sb
      .from('galleries')
      .select('*')
      .order(
        'created_at',
        { ascending:false }
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
    await sb
      .from('final_selections')
      .select('*')
      .order(
        'created_at',
        { ascending:false }
      );

  if (error) {

    console.error(error);

    return [];
  }

  return data || [];
}

function originalPhotoHtml(indices) {

  if (!Array.isArray(indices)) {
    return '';
  }

  return indices
    .map(index => {

      const url =
        demoPhotos[index];

      if (!url) return '';

      return `

        <div
          style="
            min-width:140px;
            max-width:140px;
          "
        >

          <img
            src="${url}"
            style="
              width:140px;
              height:180px;
              object-fit:cover;
              border-radius:18px;
            "
          >

          <div
            style="
              text-align:center;
              font-weight:700;
              margin-top:6px;
            "
          >
            Foto ${Number(index)+1}
          </div>

        </div>
      `;
    })
    .join('');
}

async function renderAdmin() {

  const orders =
    await getOrders();

  const galleries =
    await getGalleries();

  const finals =
    await getFinalSelections();

  app.innerHTML = `

    <div class="wrap">

      <div class="hero">

        <p class="muted">
          PAINEL ADMINISTRATIVO
        </p>

        <h1>
          Pedidos
        </h1>

        <p class="muted">
          Acompanhe seleções
          e prepare a galeria final.
        </p>

      </div>

      <div class="tabs">

        <button class="active">
          Todos
        </button>

        <button>
          Novas seleções
        </button>

        <button>
          Em produção
        </button>

        <button>
          Finalizados
        </button>

      </div>

      ${
        orders.length
        ?
        orders.map(o => {

          const gallery =
            galleries.find(
              g =>
                String(g.order_id)
                ===
                String(o.id)
            );

          const final =
            finals.find(
              f =>
                String(f.order_id)
                ===
                String(o.id)
            );

          return `

            <div class="adminCard">

              <div
                class="row"
                style="
                  justify-content:
                  space-between
                "
              >

                <div>

                  <h3>
                    ${o.client_name}
                  </h3>

                  <p class="muted">
                    ${o.phone}
                    •
                    ${
                      o.category_name
                      ||
                      o.category
                    }
                  </p>

                </div>

                <b>
                  ${
                    o.selected_photos
                      ?.length
                    || 0
                  }
                  fotos
                </b>

              </div>

              <p>
                Status:
                <b>
                  ${
                    o.status
                    ||
                    'Nova seleção'
                  }
                </b>
              </p>

              <p class="muted">
                ${
                  o.note
                  ||
                  'Sem observações'
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
                  originalPhotoHtml(
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
                          ?.length
                        || 0
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
                      border:
                      2px solid #111;
                      border-radius:16px;
                    "
                  >

                    <b>
                      Seleção final recebida ✓
                    </b>

                    <p>
                      ${
                        final
                          .selected_photos
                          ?.length
                        || 0
                      }
                      fotos escolhidas
                    </p>

                  </div>
                `
                :
                ''
              }

              <div class="row">

                <button
                  onclick="
                    readyGallery(
                      '${o.id}',
                      '${String(
                        o.client_name
                      ).replaceAll(
                        "'",
                        "\\'"
                      )}'
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
              Quando uma cliente
              enviar uma seleção,
              ela aparecerá aqui.
            </p>

          </div>
        `
      }

    </div>
  `;
}

function readyGallery(
  orderId,
  clientName
) {

  state.uploadFiles = [];
  state.uploadPreviews = [];

  app.innerHTML = `

    <div
      class="wrap"
      style="
        max-width:700px
      "
    >

      <button
        onclick="renderAdmin()"
      >
        ← Voltar
      </button>

      <div class="hero">

        <p class="muted">
          GALERIA PRONTA
        </p>

        <h1>
          ${clientName}
        </h1>

        <p class="muted">
          Envie aqui as fotos
          depois que terminar
          a edição.
        </p>

      </div>

      <div class="adminCard">

        <h2>
          1. Adicionar fotos prontas
        </h2>

        <input
          type="file"
          id="readyFiles"
          accept="image/*"
          multiple
          onchange="handleReadyFiles(this)"
          style="
            width:100%;
            margin:15px 0;
          "
        >

        <div
          id="uploadPreview"
          style="
            display:grid;
            grid-template-columns:
            repeat(2,1fr);
            gap:12px;
          "
        ></div>

      </div>

      <div class="adminCard">

        <h2>
          2. Marca-d’água
        </h2>

        <label>
          Nome ou assinatura
        </label>

        <input
          id="wmText"
          class="input"
          value="${cfg.studioName || 'Fotoflow'}"
        >

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
                '#repeatValue'
              )
              .textContent =
              this.value
          "
          style="
            width:100%;
          "
        >

        <p>
          Quantidade:
          <b id="repeatValue">
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
                '#opacityValue'
              )
              .textContent =
              this.value + '%'
          "
          style="
            width:100%;
          "
        >

        <p>
          Transparência:
          <b id="opacityValue">
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
                '#sizeValue'
              )
              .textContent =
              this.value
          "
          style="
            width:100%;
          "
        >

        <p>
          Tamanho:
          <b id="sizeValue">
            32
          </b>
        </p>

        <label>
          Inclinação
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
                '#rotationValue'
              )
              .textContent =
              this.value + '°'
          "
          style="
            width:100%;
          "
        >

        <p>
          Rotação:
          <b id="rotationValue">
            -25°
          </b>
        </p>

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
            '${String(
              clientName
            ).replaceAll(
              "'",
              "\\'"
            )}'
          )
        "
      >
        Publicar galeria
      </button>

    </div>
  `;
}

function handleReadyFiles(input) {

  const files =
    Array.from(
      input.files || []
    );

  state.uploadFiles =
    files;

  state.uploadPreviews =
    files.map(file =>
      URL.createObjectURL(file)
    );

  renderUploadPreview();
}

function renderUploadPreview() {

  const box =
    document
      .querySelector(
        '#uploadPreview'
      );

  if (!box) return;

  box.innerHTML =
    state.uploadPreviews
      .map(
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
                border-radius:16px;
              "
            >

            <button
              onclick="
                removeUploadFile(${i})
              "
              style="
                position:absolute;
                top:8px;
                right:8px;
                width:38px;
                height:38px;
                border-radius:50%;
              "
            >
              ×
            </button>

          </div>
        `
      )
      .join('');
}

function removeUploadFile(i) {

  state.uploadFiles.splice(i,1);

  const old =
    state.uploadPreviews[i];

  if (old) {
    URL.revokeObjectURL(old);
  }

  state.uploadPreviews.splice(i,1);

  renderUploadPreview();
}

function safeFileName(name) {

  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .replace(
      /[^a-z0-9._-]/g,
      '-'
    );
}

async function publishReadyGallery(
  orderId,
  clientName
) {

  if (!state.uploadFiles.length) {

    return toast(
      'Adicione pelo menos uma foto pronta.'
    );
  }

  const wmText =
    document
      .querySelector('#wmText')
      .value
      .trim()
      ||
      cfg.studioName
      ||
      'Fotoflow';

  const wmRepeat =
    Number(
      document
        .querySelector(
          '#wmRepeat'
        )
        .value
    );

  const wmOpacity =
    Number(
      document
        .querySelector(
          '#wmOpacity'
        )
        .value
    ) / 100;

  const wmSize =
    Number(
      document
        .querySelector(
          '#wmSize'
        )
        .value
    );

  const wmRotation =
    Number(
      document
        .querySelector(
          '#wmRotation'
        )
        .value
    );

  toast(
    'Enviando fotos...'
  );

  const urls = [];

  for (
    let i = 0;
    i < state.uploadFiles.length;
    i++
  ) {

    const file =
      state.uploadFiles[i];

    const random =
      typeof crypto !== 'undefined'
      &&
      crypto.randomUUID
      ?
      crypto.randomUUID()
      :
      Date.now() +
      '-' +
      Math.random()
        .toString(36)
        .slice(2);

    const path =
      orderId +
      '/' +
      random +
      '-' +
      safeFileName(
        file.name
      );

    const {
      error:
      uploadError
    } =
      await sb
        .storage
        .from('fotos-prontas')
        .upload(
          path,
          file,
          {
            cacheControl:
              '3600',

            upsert:
              false
          }
        );

    if (uploadError) {

      console.error(
        uploadError
      );

      return toast(
        'Erro no upload: ' +
        uploadError.message
      );
    }

    const {
      data:
      publicData
    } =
      sb
        .storage
        .from('fotos-prontas')
        .getPublicUrl(path);

    urls.push(
      publicData.publicUrl
    );
  }

  const galleryRow = {

    order_id:
      Number(orderId),

    client_name:
      clientName,

    watermark_text:
      wmText,

    watermark_opacity:
      wmOpacity,

    watermark_size:
      wmSize,

    watermark_rotation:
      wmRotation,

    watermark_repeat:
      wmRepeat,

    photos:
      urls,

    status:
      'Publicada'
  };

  const {
    data:
    galleryData,

    error:
    galleryError
  } =
    await sb
      .from('galleries')
      .insert(
        galleryRow
      )
      .select()
      .single();

  if (galleryError) {

    console.error(
      galleryError
    );

    return toast(
      'Erro ao criar galeria: ' +
      galleryError.message
    );
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
        padding-top:80px;
      "
    >

      <h1>
        Galeria publicada! ✓
      </h1>

      <p class="muted">
        As fotos foram enviadas
        e o link da cliente
        foi criado.
      </p>

      <input
        class="input"
        value="${url}"
        readonly
      >

      <button
        class="primary"
        style="
          width:100%;
        "
        onclick="
          navigator
            .clipboard
            .writeText(
              '${url}'
            );
          toast(
            'Link copiado!'
          );
        "
      >
        Copiar link da cliente
      </button>

      <br><br>

      <button
        onclick="
          renderAdmin()
        "
      >
        Voltar ao painel
      </button>

    </div>
  `;
}

async function copyClientLink(
  orderId
) {

  const {
    data,
    error
  } =
    await sb
      .from('galleries')
      .select('*')
      .eq(
        'order_id',
        Number(orderId)
      )
      .order(
        'created_at',
        { ascending:false }
      )
      .limit(1);

  if (
    error
    ||
    !data
    ||
    !data.length
  ) {

    return toast(
      'Crie a galeria pronta primeiro.'
    );
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

function watermarkLayer(g) {

  const repeat =
    Math.max(
      1,
      Math.min(
        15,
        Number(
          g.watermark_repeat
          || 6
        )
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
          .from(
            { length:repeat }
          )
          .map(
            (_, i) => {

              const top =
                8 +
                (
                  i *
                  83 /
                  repeat
                );

              const left =
                (
                  i * 31
                ) % 70;

              return `

                <div
                  style="
                    position:absolute;
                    top:${top}%;
                    left:${left}%;
                    transform:
                      rotate(
                        ${
                          Number(
                            g.watermark_rotation
                            || -25
                          )
                        }deg
                      );
                    font-size:
                      ${
                        Number(
                          g.watermark_size
                          || 32
                        )
                      }px;
                    font-weight:800;
                    color:white;
                    opacity:
                      ${
                        Number(
                          g.watermark_opacity
                          || 0.35
                        )
                      };
                    text-shadow:
                      0 2px 6px
                      rgba(
                        0,
                        0,
                        0,
                        .55
                      );
                    white-space:nowrap;
                  "
                >
                  ${
                    g.watermark_text
                    ||
                    cfg.studioName
                    ||
                    'Fotoflow'
                  }
                </div>
              `;
            }
          )
          .join('')
      }

    </div>
  `;
}

async function clientReady(id) {

  const {
    data:
    gallery,
    error
  } =
    await sb
      .from('galleries')
      .select('*')
      .eq(
        'id',
        Number(id)
      )
      .single();

  if (
    error
    ||
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

  state.selected = [];

  app.innerHTML = `

    <div class="wrap">

      <div class="hero">

        <p class="muted">
          FOTOS PRONTAS
          •
          ${gallery.client_name}
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
              (p, i) => `

                <div
                  class="photoWrap card"
                  id="p${i}"
                  onclick="pick(${i})"
                  style="
                    position:relative;
                    overflow:hidden;
                  "
                >

                  <img
                    class="photo"
                    src="${p}"
                  >

                  ${
                    watermarkLayer(
                      gallery
                    )
                  }

                  <span
                    class="badge"
                    style="display:none"
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
        <span id="count">
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
}

async function sendFinalSelection(
  galleryId,
  orderId
) {

  if (!state.selected.length) {

    return toast(
      'Selecione pelo menos uma foto.'
    );
  }

  const {
    data:
    gallery
  } =
    await sb
      .from('galleries')
      .select('photos')
      .eq(
        'id',
        Number(galleryId)
      )
      .single();

  const selectedUrls =
    state.selected.map(
      index =>
        gallery.photos[index]
    );

  const {
    error
  } =
    await sb
      .from(
        'final_selections'
      )
      .insert({

        gallery_id:
          Number(galleryId),

        order_id:
          Number(orderId),

        selected_photos:
          selectedUrls
      });

  if (error) {

    return toast(
      'Erro ao enviar seleção final: ' +
      error.message
    );
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

document
  .querySelector('#adminBtn')
  .onclick =
  admin;

const hash =
  location.hash.match(
    /galeria=([^&]+)/
  );

if (hash) {

  clientReady(
    hash[1]
  );

} else {

  home();
            }

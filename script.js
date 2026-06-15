/* ==========================================================================
   CATÁLOGO DE MUEBLES - LÓGICA DEL SITIO
   ========================================================================== */

// =====================================================================
// CONFIGURACIÓN EDITABLE
// =====================================================================
const CONFIG = {
  // Número de WhatsApp con código de país, SIN "+", SIN espacios ni guiones.
  // Ejemplo México: 521 + número a 10 dígitos -> "5215512345678"
  numeroWhatsApp: "5215555555555",

  // Archivo donde están los productos (generado por analizar_gemini.py)
  archivoProductos: "productos.json",

  // Carpeta donde están las imágenes copiadas (generada automáticamente)
  carpetaImagenes: "imagenes/",
};
// =====================================================================

let productos = [];
let categoriaActiva = "Todos";
let textoBusqueda = "";

const grid = document.getElementById("grid-productos");
const contenedorCategorias = document.getElementById("categorias");
const inputBuscador = document.getElementById("buscador");
const contador = document.getElementById("resultado-contador");
const sinResultados = document.getElementById("sin-resultados");

const elAnio = document.getElementById("anio");
if (elAnio) elAnio.textContent = new Date().getFullYear();

// Elementos del lightbox (visor de imagen ampliada)
const lightbox = document.getElementById("lightbox");
const lightboxImagen = document.getElementById("lightbox-imagen");
const lightboxNombre = document.getElementById("lightbox-nombre");
const lightboxDescripcion = document.getElementById("lightbox-descripcion");
const lightboxCerrar = document.getElementById("lightbox-cerrar");

/**
 * Carga productos.json y arranca el render del catálogo.
 */
async function cargarProductos() {
  try {
    const respuesta = await fetch(CONFIG.archivoProductos);
    if (!respuesta.ok) {
      throw new Error(`No se pudo cargar ${CONFIG.archivoProductos} (HTTP ${respuesta.status})`);
    }
    productos = await respuesta.json();
  } catch (error) {
    grid.innerHTML = `
      <p style="color:#b03434; padding:1rem;">
        Error al cargar <code>${CONFIG.archivoProductos}</code>: ${error.message}<br><br>
        Si abriste el archivo index.html directamente (file://), muchos navegadores
        bloquean la carga de archivos JSON locales por seguridad.<br>
        Ejecuta un servidor local, por ejemplo:<br>
        <code>python -m http.server 8000</code><br>
        y abre <code>http://localhost:8000</code>
      </p>`;
    console.error(error);
    return;
  }

  generarCategorias();
  renderizar();
}

/**
 * Genera dinámicamente los botones de categoría a partir de los productos
 * realmente presentes en productos.json.
 */
function generarCategorias() {
  const categoriasUnicas = ["Todos", ...new Set(productos.map((p) => p.categoria || "Otro"))];

  contenedorCategorias.innerHTML = "";

  categoriasUnicas.forEach((cat) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = cat;
    if (cat === categoriaActiva) btn.classList.add("activo");

    btn.addEventListener("click", () => {
      categoriaActiva = cat;
      document.querySelectorAll(".categorias button").forEach((b) => b.classList.remove("activo"));
      btn.classList.add("activo");
      renderizar();
    });

    contenedorCategorias.appendChild(btn);
  });
}

/**
 * Normaliza texto para búsquedas sin distinguir mayúsculas ni acentos.
 */
function normalizar(texto) {
  return (texto || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Devuelve los productos que cumplen con el filtro de categoría y búsqueda.
 */
function filtrarProductos() {
  const texto = normalizar(textoBusqueda);

  return productos.filter((p) => {
    const coincideCategoria = categoriaActiva === "Todos" || p.categoria === categoriaActiva;

    const coincideBusqueda =
      texto === "" ||
      [p.nombre_producto, p.descripcion, p.categoria, p.color_dominante, p.estilo].some((campo) =>
        normalizar(campo).includes(texto)
      );

    return coincideCategoria && coincideBusqueda;
  });
}

/**
 * Construye el link de WhatsApp con mensaje precargado para cotizar.
 */
function crearLinkWhatsApp(producto) {
  const mensaje =
    `Hola, me interesa cotizar este producto:\n` +
    `${producto.nombre_producto}\n` +
    `Categoría: ${producto.categoria}\n` +
    `ID: ${producto.id}`;

  return `https://wa.me/${CONFIG.numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
}

/**
 * Mapa simple de nombres de color en español a colores CSS aproximados,
 * usado para mostrar una "bolita" de color en la tarjeta.
 */
function obtenerColorCSS(nombreColor) {
  const mapa = {
    blanco: "#ffffff",
    negro: "#1a1a1a",
    gris: "#9e9e9e",
    cafe: "#6b4423",
    marron: "#6b4423",
    beige: "#e8dcc6",
    "madera natural": "#c19a6b",
    madera: "#c19a6b",
    azul: "#3b6ea5",
    verde: "#5a7d54",
    rojo: "#a33b3b",
    amarillo: "#d4b13a",
    rosa: "#d99aa5",
    naranja: "#d08b3a",
    morado: "#7d5fa6",
    dorado: "#cba135",
    plateado: "#c0c0c0",
    crema: "#f3ead9",
  };

  const clave = normalizar(nombreColor);
  for (const [k, v] of Object.entries(mapa)) {
    if (clave.includes(normalizar(k))) return v;
  }
  return "#cccccc";
}

/**
 * Crea el elemento DOM de una tarjeta de producto.
 */
function crearTarjeta(producto) {
  const tarjeta = document.createElement("article");
  tarjeta.className = "tarjeta";

  const rutaImagen = CONFIG.carpetaImagenes + producto.archivo;
  const nombre = producto.nombre_producto || "Producto sin nombre";
  const categoria = producto.categoria || "Otro";
  const descripcion = producto.descripcion || "";

  // Imagen de respaldo en caso de que el archivo no se encuentre
  const placeholder =
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="225">' +
        '<rect width="100%" height="100%" fill="#f0ebe4"/>' +
        '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" ' +
        'fill="#999" font-family="sans-serif" font-size="14">Sin imagen</text>' +
        "</svg>"
    );

  tarjeta.innerHTML = `
    <div class="tarjeta__imagen-wrap">
      <img src="${rutaImagen}" alt="${nombre}" loading="lazy"
           onerror="this.onerror=null;this.src='${placeholder}'">
    </div>
    <div class="tarjeta__cuerpo">
      <span class="tarjeta__categoria">${categoria}</span>
      <h3 class="tarjeta__nombre">${nombre}</h3>
      <p class="tarjeta__descripcion">${descripcion}</p>
      <div class="tarjeta__detalles">
        ${
          producto.color_dominante
            ? `<span><span class="color-bolita" style="background:${obtenerColorCSS(
                producto.color_dominante
              )}"></span>${producto.color_dominante}</span>`
            : ""
        }
        ${producto.estilo ? `<span>${producto.estilo}</span>` : ""}
      </div>
      <a class="tarjeta__whatsapp" target="_blank" rel="noopener noreferrer"
         href="${crearLinkWhatsApp(producto)}">
        Cotizar por WhatsApp
      </a>
    </div>
  `;

  // Al hacer clic en la imagen, abrir el visor ampliado
  const imagenWrap = tarjeta.querySelector(".tarjeta__imagen-wrap");
  imagenWrap.addEventListener("click", () => abrirLightbox(producto));

  return tarjeta;
}

/**
 * Abre el visor de imagen ampliada (lightbox) para un producto dado.
 * La imagen se ajusta siempre al tamaño disponible de la pantalla,
 * sin importar las dimensiones originales del archivo.
 */
function abrirLightbox(producto) {
  const rutaImagen = CONFIG.carpetaImagenes + producto.archivo;
  lightboxImagen.src = rutaImagen;
  lightboxImagen.alt = producto.nombre_producto || "Producto";
  lightboxNombre.textContent = producto.nombre_producto || "";
  lightboxDescripcion.textContent = producto.descripcion || "";

  lightbox.hidden = false;
  document.body.style.overflow = "hidden"; // evita scroll de fondo
}

/**
 * Cierra el visor de imagen ampliada.
 */
function cerrarLightbox() {
  lightbox.hidden = true;
  lightboxImagen.src = "";
  document.body.style.overflow = "";
}

lightboxCerrar.addEventListener("click", cerrarLightbox);

// Cerrar al hacer clic fuera de la imagen (en el fondo oscuro)
lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) cerrarLightbox();
});

// Cerrar con la tecla Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !lightbox.hidden) cerrarLightbox();
});

/**
 * Vuelve a dibujar la grilla de productos según los filtros actuales.
 */
function renderizar() {
  const filtrados = filtrarProductos();
  grid.innerHTML = "";

  if (filtrados.length === 0) {
    sinResultados.hidden = false;
  } else {
    sinResultados.hidden = true;
    const fragmento = document.createDocumentFragment();
    filtrados.forEach((p) => fragmento.appendChild(crearTarjeta(p)));
    grid.appendChild(fragmento);
  }

  contador.textContent = `${filtrados.length} producto(s) encontrado(s)`;
}

// Búsqueda en vivo
inputBuscador.addEventListener("input", (e) => {
  textoBusqueda = e.target.value;
  renderizar();
});

// Punto de entrada
cargarProductos();

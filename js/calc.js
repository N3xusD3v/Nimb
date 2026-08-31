// Calculators for IFRH navigation/performance study
const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
function norm360(a) { return ((a % 360) + 360) % 360; }

// ---- Wind triangle: TC + TAS + wind (from/speed) -> WCA, Heading, GS
function calcWind() {
  const tc = parseFloat(document.getElementById("w-tc").value);
  const tas = parseFloat(document.getElementById("w-tas").value);
  const wd = parseFloat(document.getElementById("w-wd").value);
  const ws = parseFloat(document.getElementById("w-ws").value);
  const out = document.getElementById("w-result");
  if ([tc, tas, wd, ws].some(isNaN) || tas <= 0) {
    out.textContent = "Preencha todos os campos com valores válidos.";
    return;
  }
  const A = (wd - tc) * D2R; // angle between wind-from direction and course
  const sinWCA = (ws * Math.sin(A)) / tas;
  if (Math.abs(sinWCA) > 1) {
    out.textContent = "Vento forte demais em relação ao TAS informado — sem solução real (a aeronave não alcança o rumo pedido).";
    return;
  }
  const wca = Math.asin(sinWCA) * R2D;
  const heading = norm360(tc + wca);
  const gs = tas * Math.cos(wca * D2R) - ws * Math.cos(A);

  out.textContent =
    `Ângulo vento/rota (A = WD - TC): ${(A * R2D).toFixed(1)}°\n` +
    `Correção de deriva (WCA): ${wca >= 0 ? "+" : ""}${wca.toFixed(1)}° (${wca >= 0 ? "direita" : "esquerda"})\n` +
    `Proa verdadeira (HDG): ${heading.toFixed(0)}°\n` +
    `Velocidade no solo (GS): ${gs.toFixed(1)} kt`;
}

// ---- Time / Speed / Distance / Fuel
function calcTsd() {
  const dist = parseFloat(document.getElementById("t-dist").value);
  const gs = parseFloat(document.getElementById("t-gs").value);
  const flow = parseFloat(document.getElementById("t-flow").value);
  const out = document.getElementById("t-result");
  if ([dist, gs].some(isNaN) || gs <= 0) {
    out.textContent = "Informe distância e velocidade no solo.";
    return;
  }
  const timeH = dist / gs;
  const timeMin = timeH * 60;
  let fuelTxt = "";
  if (!isNaN(flow) && flow > 0) {
    const fuel = flow * timeH;
    fuelTxt = `\nCombustível necessário: ${fuel.toFixed(1)} (mesma unidade do fluxo/h)`;
  }
  out.textContent = `Tempo de voo: ${timeMin.toFixed(1)} min (${timeH.toFixed(2)} h)${fuelTxt}`;
}

// ---- Density altitude
// Nota: existem duas constantes em uso (120 = padrão FAA/internacional; 100 = usada em
// alguns gabaritos/apostilas de banca brasileira). O app calcula as duas para não
// arriscar uma "resposta pronta" errada — confira qual sua banca/curso adota.
function calcDensityAlt() {
  const elev = parseFloat(document.getElementById("d-elev").value);
  const altSetting = parseFloat(document.getElementById("d-qnh").value); // inHg
  const oat = parseFloat(document.getElementById("d-oat").value); // Celsius
  const out = document.getElementById("d-result");
  if ([elev, altSetting, oat].some(isNaN)) {
    out.textContent = "Preencha elevação, altímetro (inHg) e temperatura (°C).";
    return;
  }
  const pa = elev + (29.92 - altSetting) * 1000;
  const isaTemp = 15 - 2 * (pa / 1000);
  const deltaT = oat - isaTemp;
  const da120 = pa + 120 * deltaT;
  const da100 = pa + 100 * deltaT;
  out.textContent =
    `Altitude de pressão (PA): ${pa.toFixed(0)} ft\n` +
    `Temperatura ISA nessa altitude: ${isaTemp.toFixed(1)} °C\n` +
    `Desvio da ISA (OAT − ISA): ${deltaT.toFixed(1)} °C\n` +
    `Altitude densidade (constante 120, padrão FAA/OACI): ${da120.toFixed(0)} ft\n` +
    `Altitude densidade (constante 100, usada em alguns gabaritos BR): ${da100.toFixed(0)} ft`;
}

// ---- Rate of descent for a given descent angle (glide path), and top of descent
function calcDescent() {
  const gs = parseFloat(document.getElementById("r-gs").value);
  const angle = parseFloat(document.getElementById("r-angle").value) || 3;
  const altToLose = parseFloat(document.getElementById("r-alt").value);
  const out = document.getElementById("r-result");
  if (isNaN(gs) || gs <= 0) {
    out.textContent = "Informe a velocidade no solo (GS).";
    return;
  }
  // Rate of descent (fpm) = GS(kt) x tan(angle) x 101.3 (rigorous), ~GS x 5 for 3°
  const rod = gs * Math.tan(angle * D2R) * 101.269;
  let todTxt = "";
  if (!isNaN(altToLose) && altToLose > 0) {
    const timeMin = altToLose / rod;
    const distNm = (timeMin / 60) * gs;
    todTxt = `\nDistância necessária para perder ${altToLose} ft: ${distNm.toFixed(1)} NM (${timeMin.toFixed(1)} min)`;
  }
  out.textContent =
    `Razão de descida (ROD) para ${angle}°: ${rod.toFixed(0)} ft/min\n` +
    `Regra prática (3°): ROD ≈ GS × 5 = ${(gs * 5).toFixed(0)} ft/min${todTxt}`;
}

// ---- Unit conversions
function calcConv() {
  const val = parseFloat(document.getElementById("c-val").value);
  const type = document.getElementById("c-type").value;
  const out = document.getElementById("c-result");
  if (isNaN(val)) { out.textContent = "Informe um valor."; return; }
  const table = {
    "nm-km": [val, val * 1.852, "NM", "km"],
    "km-nm": [val, val / 1.852, "km", "NM"],
    "kt-kmh": [val, val * 1.852, "kt", "km/h"],
    "kmh-kt": [val, val / 1.852, "km/h", "kt"],
    "ft-m": [val, val * 0.3048, "ft", "m"],
    "m-ft": [val, val / 0.3048, "m", "ft"],
    "inhg-hpa": [val, val * 33.8639, "inHg", "hPa"],
    "hpa-inhg": [val, val / 33.8639, "hPa", "inHg"],
  };
  const [from, to, uf, ut] = table[type];
  out.textContent = `${from} ${uf} = ${to.toFixed(2)} ${ut}`;
}

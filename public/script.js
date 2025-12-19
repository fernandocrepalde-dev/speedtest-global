let testando = false;
let pings = [];
let velocidades = [];
let localizacaoUsuario = null;
let grafico = null;

// =========================
// INICIALIZAÇÃO
// =========================
window.addEventListener("load", () => {
    registrarVisita();
    atualizarEstatisticas();
    setInterval(atualizarEstatisticas, 5000);
    pedirLocalizacao();
    atualizarAgulha(0);
});

// =========================
// ESTATÍSTICAS / VISITAS
// =========================
function registrarVisita() {
    fetch("/api/registrar-visita").catch(() => {});
}

function atualizarEstatisticas() {
    fetch("/api/estatisticas")
        .then(r => r.json())
        .then(data => {
            document.getElementById("visitantes").textContent =
                `👥 Visitantes: ${data.visitantes}`;
            document.getElementById("testes").textContent =
                `🧪 Testes: ${data.testes_realizados}`;
        })
        .catch(() => {});
}

// =========================
// LOCALIZAÇÃO
// =========================
function pedirLocalizacao() {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                localizacaoUsuario = {
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude
                };
            },
            () => {
                // se negar, depois cai no IP
            }
        );
    }
}

function obterLocalizacao() {
    if (localizacaoUsuario) {
        const { latitude, longitude } = localizacaoUsuario;
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
            .then(r => r.json())
            .then(data => {
                const cidade = data.address.city || data.address.town || data.address.village || "Desconhecida";
                const pais   = data.address.country || "";
                exibirResultados({ city: cidade, country_name: pais });
            })
            .catch(() => obterLocalizacaoPorIP());
    } else {
        obterLocalizacaoPorIP();
    }
}

function obterLocalizacaoPorIP() {
    fetch("https://ipapi.co/json/")
        .then(r => r.json())
        .then(data => exibirResultados(data))
        .catch(() => exibirResultados(null));
}

// =========================
// INTERFACE
// =========================
function gerarID() {
    return Math.random().toString(36).substring(2, 10) +
           Math.random().toString(36).substring(2, 10);
}

function copiarID() {
    const id = document.getElementById("resultadoID").textContent;
    navigator.clipboard.writeText(id).then(() => {
        alert("ID copiado: " + id);
    });
}

function voltarParaTeste() {
    document.getElementById("telaResultados").style.display = "none";
    document.getElementById("telaPrincipal").style.display = "block";
    pings = [];
    velocidades = [];
    atualizarAgulha(0);
    document.getElementById("valorNumero").textContent = "0";
    document.getElementById("status").textContent = "Pronto para testar";
}

// =========================
// FLUXO DO TESTE (ETAPAS)
// =========================
function iniciarTeste() {
    if (testando) return;
    testando = true;

    pings = [];
    velocidades = [];

    document.getElementById("botaoTeste").disabled = true;
    document.getElementById("status").textContent = "Medindo ping...";
    atualizarAgulha(0);
    document.getElementById("valorNumero").textContent = "0";

    medirPingMultiplo();
}

// 1) PING (várias medidas para jitter)
function medirPingMultiplo() {
    let contador = 0;

    const intervalo = setInterval(() => {
        const inicio = performance.now();

        fetch("/api/ping?x=" + Math.random(), { cache: "no-store" })
            .then(() => {
                const ping = Math.round(performance.now() - inicio);
                pings.push(ping);
                contador++;

                document.getElementById("valorNumero").textContent = ping;
                atualizarAgulha(ping); // usa escala 0–1000, mas valor é ms

                if (contador >= 5) {
                    clearInterval(intervalo);
                    document.getElementById("status").textContent = "Medindo download...";
                    setTimeout(medirDownload, 400);
                }
            })
            .catch(() => {
                contador++;
                if (contador >= 5) {
                    clearInterval(intervalo);
                    document.getElementById("status").textContent = "Medindo download...";
                    setTimeout(medirDownload, 400);
                }
            });
    }, 250);
}

// 2) DOWNLOAD
function medirDownload() {
    const inicio  = performance.now();
    const tamanho = 20 * 1024 * 1024; // 20 MB

    fetch(`https://speed.cloudflare.com/__down?bytes=${tamanho}`, { cache: "no-store" })
        .then(r => r.blob())
        .then(() => {
            const tempo = (performance.now() - inicio) / 1000; // s
            const mbps  = ((tamanho * 8) / (tempo * 1_000_000));
            const valor = Number(mbps.toFixed(2));

            velocidades[0] = valor;
            document.getElementById("valorNumero").textContent = valor;
            atualizarAgulha(valor);

            document.getElementById("status").textContent = "Medindo upload...";
            setTimeout(medirUpload, 400);
        })
        .catch(() => {
            document.getElementById("status").textContent = "Erro ao medir download";
            finalizarTeste();
        });
}

// 3) UPLOAD
function medirUpload() {
    const tamanho = 10 * 1024 * 1024; // 10 MB
    const dados   = new Uint8Array(tamanho);
    const inicio  = performance.now();

    fetch("https://httpbin.org/post", {
        method: "POST",
        body: dados
    })
    .then(() => {
        const tempo = (performance.now() - inicio) / 1000;
        const mbps  = ((tamanho * 8) / (tempo * 1_000_000));
        const valor = Number(mbps.toFixed(2));

        velocidades[1] = valor;
        document.getElementById("valorNumero").textContent = valor;
        atualizarAgulha(valor);

        obterLocalizacao();
    })
    .catch(() => {
        document.getElementById("status").textContent = "Erro ao medir upload";
        finalizarTeste();
    });
}

// =========================
// RESULTADOS + GRÁFICO
// =========================
function exibirResultados(localizacao) {
    const pingMedio = pings.length
        ? Math.round(pings.reduce((a,b)=>a+b,0) / pings.length)
        : 0;
    const jitter = pings.length
        ? Math.round(Math.max(...pings) - Math.min(...pings))
        : 0;

    const download = velocidades[0] || 0;
    const upload   = velocidades[1] || 0;

    const id = gerarID();
    document.getElementById("resultadoID").textContent      = id;
    document.getElementById("pingResultado").textContent    = pingMedio;
    document.getElementById("jitterResultado").textContent  = jitter;
    document.getElementById("downloadResultado").textContent= download;
    document.getElementById("uploadResultado").textContent  = upload;

    const servidorSelect = document.getElementById("servidorSelect");
    let nomeServidor = "Cloudflare";
    if (servidorSelect.value === "google") nomeServidor = "Google";
    if (servidorSelect.value === "amazon") nomeServidor = "Amazon SP";
    document.getElementById("servidorResultado").textContent = nomeServidor;

    let locTxt = "Desconhecida";
    if (localizacao) {
        const cidade = localizacao.city || "";
        const pais   = localizacao.country_name || "";
        locTxt = `${cidade}${cidade && pais ? ", " : ""}${pais}`;
    }
    document.getElementById("localizacaoResultado").textContent = locTxt;

    mostrarGrafico(download, upload, pingMedio);
    salvarTeste(pingMedio, download, upload, jitter, nomeServidor, locTxt);

    document.getElementById("telaPrincipal").style.display = "none";
    document.getElementById("telaResultados").style.display = "block";

    document.getElementById("status").textContent = "Teste concluído";
    finalizarTeste();
}

function mostrarGrafico(download, upload, ping) {
    const ctx = document.getElementById("graficoVelocidade").getContext("2d");
    if (grafico) grafico.destroy();

    grafico = new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["Download", "Upload", "Ping (x10)"],
            datasets: [{
                data: [download, upload, ping * 10],
                backgroundColor: [
                    "rgba(33, 212, 253, 0.7)",
                    "rgba(111, 66, 193, 0.7)",
                    "rgba(255, 99, 132, 0.7)"
                ],
                borderColor: [
                    "rgba(33, 212, 253, 1)",
                    "rgba(111, 66, 193, 1)",
                    "rgba(255, 99, 132, 1)"
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: "#9aa4c6" },
                    grid: { color: "rgba(255,255,255,0.08)" }
                },
                x: {
                    ticks: { color: "#9aa4c6" },
                    grid: { display: false }
                }
            }
        }
    });
}

function salvarTeste(ping, download, upload, jitter, servidor, localizacao) {
    fetch("/api/registrar-teste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ping, download, upload, jitter, servidor, localizacao })
    })
    .then(() => atualizarEstatisticas())
    .catch(() => {});
}

function finalizarTeste() {
    testando = false;
    document.getElementById("botaoTeste").disabled = false;
}

// =========================
// AGULHA AZUL DO VELOCÍMETRO
// =========================
// 0 -> -120°, 1000 -> +120° em torno de (160,180)
function atualizarAgulha(valor) {
    const max = 1000;
    const normalizado = Math.max(0, Math.min(valor, max));
    const proporcao   = normalizado / max;
    const angulo      = -120 + (240 * proporcao);

    const grupo    = document.getElementById("needleGroup");
    const valorLbl = document.getElementById("valorNumero");

    if (grupo) {
        grupo.setAttribute("transform", `rotate(${angulo} 160 180)`);
    }
    if (valorLbl) {
        valorLbl.textContent = normalizado.toFixed(0);
    }
}

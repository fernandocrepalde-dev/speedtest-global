const express = require("express");
const fs = require("fs");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

let dados = {
    visitantes: 0,
    testes_realizados: 0,
    data_criacao: new Date().toLocaleDateString("pt-BR"),
    historico_testes: []
};

if (fs.existsSync("dados.json")) {
    try {
        dados = JSON.parse(fs.readFileSync("dados.json", "utf8"));
    } catch (e) {
        console.log("Erro ao ler dados.json, iniciando novo arquivo");
    }
}

function salvarDados() {
    fs.writeFileSync("dados.json", JSON.stringify(dados, null, 2));
}

// Rota: Registrar visita
app.get("/api/registrar-visita", (req, res) => {
    dados.visitantes += 1;
    salvarDados();
    res.json({ sucesso: true, visitantes: dados.visitantes });
});

// Rota: Registrar teste realizado
app.post("/api/registrar-teste", (req, res) => {
    const { ping, download, upload, jitter } = req.body;

    dados.testes_realizados += 1;
    dados.historico_testes.push({
        timestamp: new Date().toISOString(),
        ping: ping,
        download: download,
        upload: upload,
        jitter: jitter
    });

    salvarDados();
    res.json({ sucesso: true, total_testes: dados.testes_realizados });
});

// Rota: Obter estatísticas
app.get("/api/estatisticas", (req, res) => {
    res.json({
        visitantes: dados.visitantes,
        testes_realizados: dados.testes_realizados,
        data_criacao: dados.data_criacao
    });
});

// Rota simples de ping para medir latência
app.get("/api/ping", (req, res) => {
    res.json({ ok: true, t: Date.now() });
});

// Rota: Página principal
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
    console.log(`📊 Visitantes: ${dados.visitantes}`);
    console.log(`🧪 Testes realizados: ${dados.testes_realizados}`);
});

const express = require("express");
const fs = require("fs");
const cors = require("cors");
const path = require("path");
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

let dados = {
    visitantes: 0,
    testes_realizados: 0,
    data_criacao: new Date().toLocaleDateString("pt-BR"),
    historico_testes: []
};

const caminhoArquivo = path.join(__dirname, "dados.json");

if (fs.existsSync(caminhoArquivo)) {
    try {
        dados = JSON.parse(fs.readFileSync(caminhoArquivo, "utf8"));
    } catch (e) {
        console.log("Erro ao ler dados.json, iniciando novo arquivo");
    }
}

function salvarDados() {
    try {
        fs.writeFileSync(caminhoArquivo, JSON.stringify(dados, null, 2));
    } catch (e) {
        console.log("Erro ao salvar dados:", e);
    }
}

app.get("/api/registrar-visita", (req, res) => {
    dados.visitantes += 1;
    salvarDados();
    res.json({ sucesso: true, visitantes: dados.visitantes });
});

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

app.get("/api/estatisticas", (req, res) => {
    res.json({
        visitantes: dados.visitantes,
        testes_realizados: dados.testes_realizados,
        data_criacao: dados.data_criacao
    });
});

app.get("/api/ping", (req, res) => {
    res.json({ ok: true, t: Date.now() });
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

module.exports = app;

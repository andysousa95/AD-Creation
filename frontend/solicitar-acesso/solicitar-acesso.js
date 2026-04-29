async function carregarCatalogo() {

    try {

        const resposta = await fetch("/api/catalogo-acessos", {
            credentials: "include"
        });

        if (!resposta.ok) {
            throw new Error("Erro ao buscar acessos");
        }

        const grupos = await resposta.json();

        const container = document.getElementById("catalogoAcesso");
        container.innerHTML = "";

        if (!grupos || grupos.length === 0) {
            container.innerHTML = "<p>Nenhum acesso disponível.</p>";
            return;
        }

        grupos.forEach(grupo => {

            const card = document.createElement("div");
            card.classList.add("card-acesso");

            card.innerHTML = `
                <div class="nome-acesso">${grupo}</div>
                <button class="botao-acesso" onclick="solicitarAcesso('${grupo}', this)">
                    Solicitar
                </button>
            `;

            container.appendChild(card);
        });

    } catch (erro) {

        console.error("Erro:", erro);

        document.getElementById("catalogoAcesso").innerHTML =
            "<p>Erro ao carregar acessos.</p>";
    }
}

async function solicitarAcesso(nomeGrupo, botao) {

    botao.textContent = "Solicitando...";
    botao.disabled = true;

    try {

        const resposta = await fetch("/api/solicitar-acesso", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({ groupName: nomeGrupo })
        });

        const dados = await resposta.json();

        if (dados.success) {
            botao.textContent = "Solicitado ✓";
            botao.classList.add("sucesso");
        } else {
            botao.textContent = "Erro";
            botao.disabled = false;
        }

    } catch (erro) {

        console.error("Erro:", erro);

        botao.textContent = "Erro";
        botao.disabled = false;
    }
}

carregarCatalogo();

function voltar() {
    window.location.href="../painel/painel.html";
}
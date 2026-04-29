async function buscarUsuario() {

    const usuario = document.getElementById("usuarioBusca").value;

    if (!usuario) {
        alert("Digite um usuário");
        return;
    }

    try {

        const res = await fetch(`/api/buscar-usuario/${usuario}`, {
            credentials: "include"
        });

        const data = await res.json();

        if (data.exists === true) {

            // usuário já existe
            document.getElementById("novoUsuario").classList.add("hidden");
            console.log("Usuário real:" , data.user);

        } else {

            // usuário não existe e mostra formulário
            document.getElementById("novoUsuario").classList.remove("hidden");

            // já preenche o campo usuário automaticamente
            document.getElementById("usuario").value = usuario;
        }

        carregarAcessos();

    } catch (err) {
        console.error("Erro ao buscar usuário:", err);
        alert("Erro ao buscar usuário");
    }
}

// CARREGAR ACESSOS

async function carregarAcessos() {

    try {

        const res = await fetch("/api/catalogo-acessos", {
            credentials: "include"
        });

        if (!res.ok) {
            throw new Error("Erro ao carregar acessos");
        }

        const acessos = await res.json();

        const container = document.getElementById("acessosContainer");
        const lista = document.getElementById("listaAcessos");

        container.classList.remove("hidden");
        lista.innerHTML = "";

        acessos.forEach(acesso => {

            const div = document.createElement("div");
            div.classList.add("acesso-item");

            div.innerHTML = `
                <input type="checkbox" value="${acesso}">
                <label>${acesso}</label>
            `;

            lista.appendChild(div);
        });

    } catch (err) {
        console.error("Erro ao carregar acessos:", err);
        alert("Erro ao carregar acessos");
    }
}

// SOLICITAR ACESSOS

async function solicitarAcessos() {

    const usuarioBusca = document.getElementById("usuarioBusca").value;
    const novoVisivel = !document.getElementById("novoUsuario").classList.contains("hidden");

    try {

        let usernameFinal = usuarioBusca;

        // criar usuário
        if (novoVisivel) {

            const nome = document.getElementById("nome").value;
            const email = document.getElementById("email").value;
            const usuario = document.getElementById("usuario").value;

            if (!nome || !email || !usuario) {
                alert("Preencha todos os campos do novo usuário");
                return;
            }

            const res = await fetch("/api/criar-usuario", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    nome,
                    email,
                    username: usuario
                })
            });

            const data = await res.json();

            if (!data.success) {
                alert("Erro ao criar usuário");
                return;
            }

            usernameFinal = usuario;
        }

        //pegar acessos selecionados
        const checkboxes = document.querySelectorAll("#listaAcessos input:checked");

        if (checkboxes.length === 0) {
            alert("Selecione pelo menos um acesso");
            return;
        }

        for (const checkbox of checkboxes) {

            const grupo = checkbox.value;

            await fetch("/api/solicitar-acesso", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    groupName: grupo,
                    username: usernameFinal 
                })
            });
        }

        alert("Acessos solicitados com sucesso!");

        window.location.reload();

    } catch (err) {

        console.error("Erro ao solicitar acessos:", err);
        alert("Erro no processo");
    }
}

// voltar

function voltar() {
    window.location.href = "../painel";
}
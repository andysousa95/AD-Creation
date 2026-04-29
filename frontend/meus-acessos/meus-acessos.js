async function carregarMeusAccessos() {

    try {

        const response = await fetch("/api/meus-acessos", {
            credentials: "include"
        });

        if (!response.ok) {
            throw new Error("Erro ao buscar acessos");
        }

        const data = await response.json();

        const container = document.getElementById("accessContainer");
        container.innerHTML = "";

        if (!data.groups || data.groups.length === 0) {

            container.innerHTML = "<p>Você ainda não possui acessos cadastrados.</p>";
            return;

        }

        const ul = document.createElement("ul");

        data.groups.forEach(group => {

            const li = document.createElement("li");
            li.textContent = group;

            ul.appendChild(li);

        });

        container.appendChild(ul);

    } catch (error) {

        console.error("Erro ao carregar acessos:", error);

        document.getElementById("accessContainer").innerHTML = "<p>Erro ao carregar acessos.</p>";

    }

}

document.getElementById("requestBtn").addEventListener("click", () => {
    window.location.href = "../solicitar-acesso/solicitar-acesso.html";
});

document.getElementById("backBtn").addEventListener("click", () => {
    window.location.href = "../painel/painel.html";
});

carregarMeusAccessos();
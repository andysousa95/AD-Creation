document.getElementById("loginForm").addEventListener("submit", async function(e){
    e.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const response = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (data.success) {
        window.location.href = "../painel/painel.html";
    } else {
        alert("Usuário ou senha inválidos");
    }
});
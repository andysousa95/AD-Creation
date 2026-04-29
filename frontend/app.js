const fullNameInput = document.getElementById("fullName");
const usernameInput = document.getElementById("username");
const form = document.getElementById("userForm");
const resultDiv = document.getElementById("result");

fullNameInput.addEventListener("input", () => {
    const nameParts = fullNameInput.value.trim().toLowerCase().split(" ");

    if (nameParts.length >= 2) {
        const username = nameParts[0] + "." + nameParts[nameParts.length - 1];
        usernameInput.value = username;
    }
});

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const accesses = [];
    document.querySelectorAll(".access:checked").forEach(cb => {
        accesses.push(cb.value);
    });

    const data = {
        fullName: fullNameInput.value,
        username: usernameInput.value,
        department: document.getElementById("department").value,
        role: document.getElementById("role").value,
        accesses: accesses
    };

    console.log("Dados enviados:", data);

    // Aqui vai chamar o backend depois
    resultDiv.innerHTML = `
        <div class="alert alert-success">
            Usuário ${data.username} enviado para criação!
        </div>
    `;
});

function requireGroup(groupName) {
    return (req, res, next) => {
        if (!req.session.groups)
            return res.status(403).json({ error: "Sem permissão" });

        const hasGroup = req.session.groups.some(g => g.includes(groupName));

        if (!hasGroup)
            return res.status(403).json({ error: "Acesso negado" });

        next ();
    };
}
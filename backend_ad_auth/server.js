const express = require("express");
const ldap = require("ldapjs");
const bodyParser = require("body-parser");
const session = require("express-session");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(express.static(path.join(__dirname, "../frontend")));

app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}));

app.use(bodyParser.json());

app.use(session({
    secret: "portal_secret_key",
    resave: false,
    saveUninitialized: false
}));

// CONFIG AD
const LDAP_URL = process.env.LDAP_URL;
const DOMAIN = process.env.DOMAIN;

const BASE_DN = process.env.BASE_DN;
const BASE_DN_USERS = process.env.BASE_DN_USERS;

const ADMIN_DN = process.env.ADMIN_DN;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// ================= HELPERS =================

function getAttr(entry, attrName) {
    if (entry.object && entry.object[attrName]) {
        return entry.object[attrName];
    }

    if (entry.attributes) {
        const attr = entry.attributes.find(a => a.type === attrName);
        if (attr?.values?.length > 0) {
            return attr.values[0];
        }
    }

    return null;
}

function bindAsAdmin(client) {
    return new Promise((resolve, reject) => {
        client.bind(ADMIN_DN, ADMIN_PASSWORD, err => {
            if (err) reject(err);
            else resolve();
        });
    });
}

// ================= ROTAS =================

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "frontend", "login.html"));
});

app.get("/", (req, res) => res.redirect("/login"));

app.get("/dashboard", (req, res) => {
    if (!req.session.user) return res.redirect("/login");
    res.sendFile(path.join(__dirname, "../frontend/painel/painel.html"));
});

app.get("/me", (req, res) => {
    if (!req.session.user)
        return res.status(401).json({ error: "Não autenticado" });

    res.json({ username: req.session.user });
});

// ================= LOGIN =================

app.post("/login", (req, res) => {

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false });
    }

    const client = ldap.createClient({ url: LDAP_URL });
    const userPrincipalName = `${username}@${DOMAIN}`;

    client.bind(userPrincipalName, password, (err) => {

        if (err) {
            return res.status(401).json({ success: false });
        }

        req.session.user = username;

        client.unbind();
        res.json({ success: true, redirect: "/dashboard" });
    });
});

// ================= CATÁLOGO =================

app.get("/api/catalogo-acessos", async (req, res) => {

    if (!req.session.user)
        return res.status(401).json({ error: "Não autenticado" });

    const client = ldap.createClient({ url: LDAP_URL });

    try {
        await bindAsAdmin(client);

        const opts = {
            filter: "(objectClass=group)",
            scope: "sub",
            attributes: ["cn"],
            paged: { pageSize: 1000 }
        };

        const groups = [];

        client.search(BASE_DN, opts, (err, ldapRes) => {

            if (err) {
                client.unbind();
                return res.status(500).json({ error: err.message });
            }

            ldapRes.on("searchEntry", (entry) => {
                const cn = getAttr(entry, "cn");
                if (cn) groups.push(cn);
            });

            ldapRes.on("error", (err) => {
                client.unbind();
                res.status(500).json({ error: err.message });
            });

            ldapRes.on("end", () => {
                client.unbind();
                res.json(groups);
            });

        });

    } catch (err) {
        client.unbind();
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/meus-acessos", async (req, res) => {
    
    if (!req.session.user) {
        return res.status(401).json({ error: "Usuário não autenticado" });
    }

    try {
        const groups = await getUserGroups(req.session.user);

        res.json({
            username: req.session.user,
            groups: groups
        });
    } catch (err) {
        console.error("ERRO /api/meus-acessos:", err);

        res.status(500).json({
            error: "Erro ao buscar acessos",
            detalhe: err.message
        });
    }
});

app.get("/api/buscar-usuario/:usuario", async (req, res) => {

    if (!req.session.user) {
        return res.status(401).json ({ error: "Não autenticado "});
    }

    const usuario = req.params.usuario.trim();

    try {

        const client = ldap.createClient({ url: LDAP_URL });
        await bindAsAdmin(client);

        const opts = {
            filter: `(|(sMAccountName=${usuario})(userPrincipalName=${usuario}@${DOMAIN})(cn=*${usuario}*))`,
            scope: "sub",
            attributes: ["cn", "sAMAccountName"]
        };

        let encontrado = false;
        let userData = null;

        client.search(BASE_DN, opts, (err, ldapRes) => {

            if (err) {
                client.unbind();
                return res.status(500).json({ error: err.message });
            }

            ldapRes.on("searchEntry", () => {
                encontrado = true;

                userData = {
                    nome: entry.object.cn,
                    username: entry.object.sAMAccountName
                }

                console.log("Usuário encontrado: ", userData);
            });

            ldapRes.on("end", () => {
                client.unbind();
                res.json({ exists: encontrado, user: userData });
            });

            ldapRes.on("error", (err) => {
                client.unbind();
                res.status(500).json({ error: err.message });
            });
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================= USER GROUPS =================

async function getUserGroups(username) {

    const client = ldap.createClient({ url: LDAP_URL });
    await bindAsAdmin(client);

    const userDN = await new Promise((resolve, reject) => {

        const opts = {
            filter: `(sAMAccountName=${username})`,
            scope: "sub",
            attributes: ["distinguishedName"]
        };

        client.search(BASE_DN_USERS, opts, (err, ldapRes) => {

            if (err) return reject(err);

            ldapRes.on("searchEntry", (entry) => {
                const dn = getAttr(entry, "distinguishedName");
                if (dn) resolve(dn);
            });

            ldapRes.on("error", reject);
            ldapRes.on("end", () => reject("Usuário não encontrado"));
        });
    });

    return new Promise((resolve, reject) => {

        const groups = [];

        const opts = {
            filter: `(member=${userDN})`,
            scope: "sub",
            attributes: ["cn"]
        };

        client.search(BASE_DN, opts, (err, ldapRes) => {

            if (err) return reject(err);

            ldapRes.on("searchEntry", (entry) => {
                const cn = getAttr(entry, "cn");
                if (cn) groups.push(cn);
            });

            ldapRes.on("end", () => {
                client.unbind();
                resolve(groups);
            });

            ldapRes.on("error", reject);
        });
    });
}

// ================= SOLICITAR ACESSO =================

app.post("/api/solicitar-acesso", async (req, res) => {

    if (!req.session.user)
        return res.status(401).json({ error: "Não autenticado" });

    const { groupName } = req.body;

    const client = ldap.createClient({ url: LDAP_URL });

    try {
        await bindAsAdmin(client);

        const userDN = await getUserDN(req.session.user);
        const groupDN = `CN=${groupName},${BASE_DN}`;

        const change = new ldap.Change({
            operation: "add",
            modification: { member: userDN }
        });

        client.modify(groupDN, change, (err) => {

            client.unbind();

            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json({ success: true });
        });

    } catch (err) {
        client.unbind();
        res.status(500).json({ error: err.message });
    }
});

// ================= GET USER DN =================

async function getUserDN(username) {

    const client = ldap.createClient({ url: LDAP_URL });
    await bindAsAdmin(client);

    return new Promise((resolve, reject) => {

        const opts = {
            filter: `(sAMAccountName=${username})`,
            scope: "sub"
        };

        client.search(BASE_DN_USERS, opts, (err, ldapRes) => {

            if (err) return reject(err);

            ldapRes.on("searchEntry", (entry) => {

                if (entry.objectName) {
                    resolve(entry.objectName);
                } else if (entry.dn) {
                    resolve(entry.dn.toString());
                }
            });

            ldapRes.on("error", reject);
        });
    });
}

// ================= START =================

app.listen(3000, () => {
    console.log("Servidor on e rodando na porta 3000");
});
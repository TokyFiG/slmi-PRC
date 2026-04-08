
        const UTILISATEURS = [
            { username: "admin", password: "1234", nom: "Administrateur", role: "admin" },
            { username: "max", password: "slmi2026", nom: "Max", role: "admin" },
            { username: "user", password: "1234", nom: "Utilisateur", role: "user" }
        ];

        if (sessionStorage.getItem("slmi_user")) {
            window.location.href = "../pages/presence.html";
        }

        function afficherAlerte(message) {
            document.getElementById("alertZone").innerHTML = `
                <div class="alert alert-danger" role="alert">
                    ${message}
                </div>
            `;
        }

        function seConnecter(event) {
            event.preventDefault();

            const username = document.getElementById("username").value.trim();
            const password = document.getElementById("password").value;

            const utilisateur = UTILISATEURS.find(
                u => u.username === username && u.password === password
            );

            if (!utilisateur) {
                afficherAlerte("Identifiant ou mot de passe incorrect.");
                return;
            }

            sessionStorage.setItem("slmi_user", JSON.stringify({
                username: utilisateur.username,
                nom: utilisateur.nom,
                role: utilisateur.role
            }));

            window.location.href = "../pages/presence.html";
        }
   

const userData = JSON.parse(sessionStorage.getItem("slmi_user"));

if (!userData) {
    window.location.href = "../index.html";
} else {
    const zoneUser = document.getElementById("userConnecte");
    if (zoneUser) {
        zoneUser.textContent = userData.nom;
    }
}
    const STORAGE_KEY = 'gestion_presences_data';
    let presences = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

    document.getElementById('datePresence').value = new Date().toISOString().split('T')[0];

    function sauvegarder() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(presences));
    }

    function ajouterPresence() {
        const nom = document.getElementById('nom').value.trim();
        const date = document.getElementById('datePresence').value;
        const heureArrivee = document.getElementById('heureArrivee').value;
        const frais = document.getElementById('frais').value;

        if (!nom || !date || !heureArrivee  === '') {
            alert('Merci de remplir tous les champs.');
            return;
        }

        presences.push({
            id: Date.now(),
            nom,
            date,
            heureArrivee,
            heureSortie: '',
            frais: Number(frais)
        });

        sauvegarder();
        afficherPresences();
        mettreAJourStats();

        document.getElementById('nom').value = '';
        document.getElementById('heureArrivee').value = '';
        document.getElementById('frais').value = '';
    }

    function ajouterSortie(id) {
        const item = presences.find(x => x.id === id);
        if (!item || item.heureSortie) return;

        const maintenant = new Date();
        const hh = String(maintenant.getHours()).padStart(2, '0');
        const mm = String(maintenant.getMinutes()).padStart(2, '0');

        item.heureSortie = `${hh}:${mm}`;

        sauvegarder();
        afficherPresences();
        mettreAJourStats();
    }

    function modifierPresence(id) {
        const item = presences.find(x => x.id === id);
        if (!item) return;

        const nouveauNom = prompt('Modifier le nom :', item.nom);
        if (nouveauNom === null) return;

        const nouvelleDate = prompt('Modifier la date (AAAA-MM-JJ) :', item.date);
        if (nouvelleDate === null) return;

        const nouvelleHeure = prompt("Modifier l'heure d'arrivée (HH:MM) :", item.heureArrivee || '');
        if (nouvelleHeure === null) return;

        const nouvelleHeureSortie = prompt("Modifier l'heure de sortie (HH:MM) :", item.heureSortie || '');
        if (nouvelleHeureSortie === null) return;

        const nouveauxFrais = prompt('Modifier les frais :', item.frais ?? 0);
        if (nouveauxFrais === null) return;

        if (!nouveauNom.trim() || !nouvelleDate.trim() || !nouvelleHeure.trim() || nouveauxFrais === '' || isNaN(Number(nouveauxFrais))) {
            alert('Modification invalide. Vérifiez les champs saisis.');
            return;
        }

        item.nom = nouveauNom.trim();
        item.date = nouvelleDate.trim();
        item.heureArrivee = nouvelleHeure.trim();
        item.heureSortie = nouvelleHeureSortie.trim();
        item.frais = Number(nouveauxFrais);

        sauvegarder();
        afficherPresences();
        mettreAJourStats();
    }

    function supprimerPresence(id) {
    const confirmation = confirm("Voulez-vous vraiment supprimer cette présence ?");

    if (!confirmation) return;

    presences = presences.filter(item => item.id !== id);
    sauvegarder();
    afficherPresences();
    mettreAJourStats();
}

    function obtenirDonneesFiltrees() {
        const rechercheNom = document.getElementById('rechercheNom').value.trim().toLowerCase();

        return presences.filter(item => {
            const nomMatch = !rechercheNom || item.nom.toLowerCase().includes(rechercheNom);
            return nomMatch;
        });
    }

    function afficherPresences() {
        const data = obtenirDonneesFiltrees();
        const zone = document.getElementById('tableZone');

        if (data.length === 0) {
            zone.innerHTML = '<div class="empty">Aucune présence enregistrée.</div>';
            return;
        }

        const afficherColonneSortie = data.some(item => item.heureSortie);

        let html = `
            <table>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Date</th>
                  <th>Heure d'arrivée</th>
                  ${afficherColonneSortie ? '<th>Heure de sortie</th>' : ''}
                  <th>Frais</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
          `;

        data.forEach(item => {
            html += `
              <tr>
                <td data-label="Nom">${item.nom}</td>
                <td data-label="Date">${formatDate(item.date)}</td>
                <td data-label="Heure d'arrivée">${item.heureArrivee || '-'}</td>
                ${afficherColonneSortie ? `<td data-label="Heure de sortie">${item.heureSortie || '-'}</td>` : ''}
                <td data-label="Frais">${formatMontant(item.frais)} Ar</td>
                <td data-label="Actions">
                  <div class="actions">
                  <button class="btn btn-secondary" onclick="modifierPresence(${item.id})">Modifier</button>
                    <button class="btn btn-danger" onclick="supprimerPresence(${item.id})">Supprimer</button>
                    <button class="btn btn-primary" onclick="ajouterSortie(${item.id})" ${item.heureSortie ? 'disabled' : ''}>
                        ${item.heureSortie ? 'Déjà sortie' : 'Sortie'}
                    </button>    
                  </div>
                </td>
              </tr>
            `;
        });
        html += '</tbody></table>';
        zone.innerHTML = html;
    }

    function mettreAJourStats() {
        document.getElementById('total').textContent = presences.length;

        const totalFrais = presences.reduce((sum, item) => sum + (Number(item.frais) || 0), 0);
        document.getElementById('totalFrais').textContent = formatMontant(totalFrais) + ' Ar';

        const joursUniques = new Set(presences.map(x => x.date).filter(Boolean));
        document.getElementById('nbJour').textContent = joursUniques.size;

        const heures = presences
            .map(x => x.heureArrivee)
            .filter(Boolean)
            .map(h => {
                const [hh, mm] = h.split(':').map(Number);
                return hh * 60 + mm;
            });

        if (heures.length) {
            const moyenne = Math.round(heures.reduce((a, b) => a + b, 0) / heures.length);
            const hh = String(Math.floor(moyenne / 60)).padStart(2, '0');
            const mm = String(moyenne % 60).padStart(2, '0');
            document.getElementById('heureMoyenne').textContent = `${hh}:${mm}`;
        } else {
            document.getElementById('heureMoyenne').textContent = '--:--';
        }
    }

    function formatDate(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('fr-FR');
    }

    function formatMontant(valeur) {
        return Number(valeur || 0).toLocaleString('fr-FR');
    }

    function exporterPDF() {
        const data = obtenirDonneesFiltrees();
        if (data.length === 0) {
            alert('Aucune donnée à exporter.');
            return;
        }

        const afficherColonneSortie = data.some(item => item.heureSortie);

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(16);
        doc.text('Rapport de présence', 14, 15);
        doc.setFontSize(10);
        doc.text(`Date d'export : ${new Date().toLocaleString('fr-FR')}`, 14, 22);

        const totalPersonnes = data.length;
        const totalFrais = data.reduce((sum, item) => sum + (Number(item.frais) || 0), 0);

        doc.text(`Nombre de personnes ajoutées : ${totalPersonnes}`, 14, 29);
        doc.text(`Total des frais : ${formatMontant(totalFrais)} Ar`, 14, 35);

        const rows = data.map(item => {
            const ligne = [
                item.nom,
                formatDate(item.date),
                item.heureArrivee || '-'
            ];

            if (afficherColonneSortie) {
                ligne.push(item.heureSortie || '-');
            }

            ligne.push(formatMontant(item.frais) + ' Ar');
            return ligne;
        });

        const head = [[
            'Nom',
            'Date',
            "Heure d'arrivée",
            ...(afficherColonneSortie ? ['Heure de sortie'] : []),
            'Frais'
        ]];

        doc.autoTable({
            head: head,
            body: rows,
            startY: 42
        });
        const today = new Date();

        // Format JJ-MM-AAAA
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();

        const fileName = `rapport-presence-${day}-${month}-${year}.pdf`;

        doc.save(fileName);
    }

    function viderDonnees() {
        if (!confirm('Voulez-vous vraiment supprimer toutes les données ?')) return;
        presences = [];
        sauvegarder();
        afficherPresences();
        mettreAJourStats();
    }

    function deconnexion() {
        sessionStorage.removeItem("slmi_user");
        window.location.href = "../index.html";
    }
    afficherPresences();
    mettreAJourStats();

const userData = JSON.parse(sessionStorage.getItem("slmi_user"));

if (!userData) {
    window.location.href = "../index.html";
} else {
    const zoneUser = document.getElementById("userConnecte");
    const zoneUserNom = document.getElementById("userConnecteNom");

    if (zoneUser) zoneUser.textContent = userData.nom;
    if (zoneUserNom) zoneUserNom.textContent = userData.nom;
}

const STORAGE_KEY = 'gestion_presences_data';
const PERSONNEL_KEY = 'gestion_personnels_data';

let presences = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let personnels = JSON.parse(localStorage.getItem(PERSONNEL_KEY)) || [];

/* =========================
   PAGINATION
========================= */
const LIGNES_PAR_PAGE = 10;
let pageActuelle = 1;

/* =========================
   OUTILS DATE / HEURE
========================= */
function getNowMadagascar() {
    const now = new Date();

    const dateFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Indian/Antananarivo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });

    const timeFormatter = new Intl.DateTimeFormat('fr-FR', {
        timeZone: 'Indian/Antananarivo',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    return {
        date: dateFormatter.format(now),
        heure: timeFormatter.format(now)
    };
}

function getDateAujourdhui() {
    return getNowMadagascar().date;
}

function getHeureActuelle() {
    return getNowMadagascar().heure;
}

function getHeureActuelleHM() {
    return getNowMadagascar().heure.slice(0, 5);
}

function afficherMessage(message, type = "success") {
    const box = document.getElementById("messageBox");
    if (!box) return;

    box.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show shadow" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;

    setTimeout(() => {
        box.innerHTML = "";
    }, 3000);
}

function mettreHeureActuelle() {
    const champHeure = document.getElementById('heureArrivee');
    if (champHeure) {
        champHeure.value = getHeureActuelleHM();
    }
}

function mettreDateAujourdhuiSiVideOuAuto() {
    const champDate = document.getElementById('datePresence');
    if (!champDate) return;

    if (!champDate.value || champDate.dataset.auto === "true") {
        champDate.value = getDateAujourdhui();
        champDate.dataset.auto = "true";
    }
}

function genererMatricule() {
    if (personnels.length === 0) return "EMP001";

    const numeros = personnels
        .map(p => {
            const match = String(p.matricule || '').match(/\d+/);
            return match ? parseInt(match[0], 10) : 0;
        })
        .filter(n => !isNaN(n));

    const max = numeros.length ? Math.max(...numeros) : 0;
    return `EMP${String(max + 1).padStart(3, '0')}`;
}

function sauvegarder() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presences));
}

function sauvegarderPersonnels() {
    localStorage.setItem(PERSONNEL_KEY, JSON.stringify(personnels));
}

function formatDate(dateStr) {
    if (!dateStr) return '-';

    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return dateStr;

    return `${day}/${month}/${year}`;
}

function formatMontant(valeur) {
    return Number(valeur || 0).toLocaleString('fr-FR');
}

function formatMinutesToHM(totalMinutes) {
    totalMinutes = Number(totalMinutes || 0);
    const heures = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(heures).padStart(2, '0')}h${String(minutes).padStart(2, '0')}`;
}

function creerDateTime(dateStr, heureStr) {
    if (!dateStr || !heureStr) return null;

    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = heureStr.split(':').map(Number);

    if (
        isNaN(year) || isNaN(month) || isNaN(day) ||
        isNaN(hours) || isNaN(minutes)
    ) {
        return null;
    }

    return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

function calculerMinutesTravail(dateArrivee, heureArrivee, dateSortie, heureSortie, totalPauseMinutes = 0) {
    if (!dateArrivee || !heureArrivee || !dateSortie || !heureSortie) return 0;

    const debut = creerDateTime(dateArrivee, heureArrivee);
    const fin = creerDateTime(dateSortie, heureSortie);

    if (!debut || !fin) return 0;

    let diff = fin.getTime() - debut.getTime();

    if (diff < 0) {
        diff += 24 * 60 * 60 * 1000;
    }

    const totalMinutes = Math.floor(diff / 60000);
    const minutesTravail = totalMinutes - Number(totalPauseMinutes || 0);

    return Math.max(0, minutesTravail);
}

function calculerHeuresTravail(dateArrivee, heureArrivee, dateSortie, heureSortie, totalPauseMinutes = 0) {
    if (!dateArrivee || !heureArrivee || !dateSortie || !heureSortie) return '-';
    return formatMinutesToHM(
        calculerMinutesTravail(dateArrivee, heureArrivee, dateSortie, heureSortie, totalPauseMinutes)
    );
}

function migrerAnciennesDonnees() {
    let modifie = false;

    presences = presences.map(item => {
        if (!item.dateArrivee) {
            item.dateArrivee = item.date || '';
            modifie = true;
        }

        if (!item.dateSortie && item.heureSortie) {
            item.dateSortie = item.dateArrivee || item.date || '';
            modifie = true;
        }

        if (typeof item.totalPauseMinutes === 'undefined') {
            item.totalPauseMinutes = 0;
            modifie = true;
        }

        if (typeof item.pauseEnCours === 'undefined') {
            item.pauseEnCours = false;
            modifie = true;
        }

        if (typeof item.pauseDebut === 'undefined') {
            item.pauseDebut = '';
            modifie = true;
        }

        if (!Array.isArray(item.historiquePauses)) {
            item.historiquePauses = [];
            modifie = true;
        }

        item.heuresTravailMinutes = calculerMinutesTravail(
            item.dateArrivee || item.date || '',
            item.heureArrivee || '',
            item.dateSortie || '',
            item.heureSortie || '',
            item.totalPauseMinutes || 0
        );

        item.heuresTravail = item.heureSortie
            ? formatMinutesToHM(item.heuresTravailMinutes || 0)
            : '-';

        return item;
    });

    if (modifie) sauvegarder();
}

function ajouterPersonnel() {
    const nomEl = document.getElementById('nomPersonnel');
    const departementEl = document.getElementById('departementPersonnel');

    const matricule = genererMatricule();
    const nom = nomEl ? nomEl.value.trim() : '';
    const departement = departementEl ? departementEl.value : '';

    if (!nom || !departement) {
        alert('Merci de remplir tous les champs du personnel.');
        return;
    }

    personnels.push({
        id: Date.now(),
        matricule,
        nom,
        departement
    });

    sauvegarderPersonnels();
    afficherPersonnels();
    chargerListePersonnel();
    remplirFiltreDepartement();

    if (nomEl) nomEl.value = '';
    if (departementEl) departementEl.value = '';

    afficherMessage("Personnel ajouté avec succès.");

    const modalElement = document.getElementById('modalPersonnel');
    if (modalElement && window.bootstrap) {
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) modalInstance.hide();
    }
}

function chargerListePersonnel() {
    const select = document.getElementById('personnelSelect');
    if (!select) return;

    const valeurActuelle = select.value;

    select.innerHTML = `<option value="">-- Sélectionner un personnel --</option>`;

    personnels.forEach(item => {
        const option = document.createElement('option');
        option.value = String(item.id);
        option.textContent = `${item.nom} (${item.matricule})`;
        select.appendChild(option);
    });

    if ([...select.options].some(opt => opt.value === valeurActuelle)) {
        select.value = valeurActuelle;
    }
}

function remplirInfosPersonnel() {
    const select = document.getElementById('personnelSelect');
    if (!select) return;

    const id = Number(select.value);
    const item = personnels.find(p => Number(p.id) === id);

    const matriculeEl = document.getElementById('matriculeAffiche');
    const nomEl = document.getElementById('nom');
    const departementEl = document.getElementById('departement');
    const fraisEl = document.getElementById('frais');

    if (matriculeEl) matriculeEl.value = item ? item.matricule : '';
    if (nomEl) nomEl.value = item ? item.nom : '';
    if (departementEl) departementEl.value = item ? item.departement : '';
    if (fraisEl) fraisEl.value = '';
}

function ajouterPresence() {
    const personnelSelectEl = document.getElementById('personnelSelect');
    const localisationEl = document.getElementById('localisation');
    const datePresenceEl = document.getElementById('datePresence');
    const fraisEl = document.getElementById('frais');

    const personnelId = personnelSelectEl ? Number(personnelSelectEl.value) : 0;
    const itemPersonnel = personnels.find(p => Number(p.id) === personnelId);

    const localisation = localisationEl ? localisationEl.value.trim() : '';
    const dateArrivee = datePresenceEl ? datePresenceEl.value : '';
    const heureArrivee = getHeureActuelle();
    const frais = fraisEl ? fraisEl.value || 0 : 0;

    if (!itemPersonnel) {
        alert('Merci de sélectionner un personnel.');
        return;
    }

    if (!localisation) {
        alert('Merci de sélectionner une position.');
        return;
    }

    if (!dateArrivee) {
        alert('Merci de sélectionner une date.');
        return;
    }

    presences.unshift({
        id: Date.now(),
        personnelId: itemPersonnel.id,
        matricule: itemPersonnel.matricule,
        nom: itemPersonnel.nom,
        departement: itemPersonnel.departement,
        localisation,
        date: dateArrivee,
        dateArrivee,
        heureArrivee,
        dateSortie: '',
        heureSortie: '',
        frais: Number(frais),
        totalPauseMinutes: 0,
        pauseEnCours: false,
        pauseDebut: '',
        historiquePauses: [],
        heuresTravailMinutes: 0,
        heuresTravail: '-'
    });

    sauvegarder();
    pageActuelle = 1;
    afficherPresences();

    if (personnelSelectEl) personnelSelectEl.value = '';
    const matriculeEl = document.getElementById('matriculeAffiche');
    const nomEl = document.getElementById('nom');
    const departementEl = document.getElementById('departement');

    if (matriculeEl) matriculeEl.value = '';
    if (nomEl) nomEl.value = '';
    if (departementEl) departementEl.value = '';
    if (localisationEl) localisationEl.value = '';
    if (fraisEl) fraisEl.value = '';

    if (datePresenceEl) {
        datePresenceEl.value = getDateAujourdhui();
        datePresenceEl.dataset.auto = "true";
    }

    mettreHeureActuelle();
    afficherMessage("Présence ajoutée avec succès.");
}

function demarrerPause(id) {
    const item = presences.find(x => x.id === id);
    if (!item) return;

    if (item.heureSortie) {
        alert("Cette présence a déjà une sortie.");
        return;
    }

    if (item.pauseEnCours) {
        alert("Une pause est déjà en cours.");
        return;
    }

    item.pauseEnCours = true;
    item.pauseDebut = `${getDateAujourdhui()} ${getHeureActuelle()}`;

    sauvegarder();
    afficherPresences();
    afficherMessage("Pause démarrée avec succès.", "warning");
}

function terminerPause(id) {
    const item = presences.find(x => x.id === id);
    if (!item) return;

    if (!item.pauseEnCours || !item.pauseDebut) {
        alert("Aucune pause en cours.");
        return;
    }

    const [dateDebutPause, heureDebutPause] = item.pauseDebut.split(' ');
    const dateFinPause = getDateAujourdhui();
    const heureFinPause = getHeureActuelle();

    const debut = creerDateTime(dateDebutPause, heureDebutPause);
    const fin = creerDateTime(dateFinPause, heureFinPause);

    if (!debut || !fin) {
        alert("Erreur sur le calcul de la pause.");
        return;
    }

    let diff = fin.getTime() - debut.getTime();
    if (diff < 0) {
        diff += 24 * 60 * 60 * 1000;
    }

    const minutesPause = Math.floor(diff / 60000);

    item.totalPauseMinutes = Number(item.totalPauseMinutes || 0) + minutesPause;
    item.historiquePauses.push({
        debut: item.pauseDebut,
        fin: `${dateFinPause} ${heureFinPause}`,
        minutes: minutesPause
    });
    item.pauseEnCours = false;
    item.pauseDebut = '';

    if (item.heureSortie) {
        item.heuresTravailMinutes = calculerMinutesTravail(
            item.dateArrivee || item.date,
            item.heureArrivee,
            item.dateSortie || '',
            item.heureSortie || '',
            item.totalPauseMinutes || 0
        );
        item.heuresTravail = formatMinutesToHM(item.heuresTravailMinutes || 0);
    }

    sauvegarder();
    afficherPresences();
    afficherMessage("Retour de pause enregistré avec succès.");
}

function ajouterSortie(id) {
    const item = presences.find(x => x.id === id);
    if (!item || item.heureSortie) return;

    if (item.pauseEnCours) {
        alert("Impossible de faire la sortie pendant une pause en cours.");
        return;
    }

    const dateSortie = getDateAujourdhui();
    const heureSortie = getHeureActuelle();

    item.dateSortie = dateSortie;
    item.heureSortie = heureSortie;
    item.heuresTravailMinutes = calculerMinutesTravail(
        item.dateArrivee || item.date,
        item.heureArrivee,
        item.dateSortie,
        item.heureSortie,
        item.totalPauseMinutes || 0
    );
    item.heuresTravail = formatMinutesToHM(item.heuresTravailMinutes || 0);

    sauvegarder();
    afficherPresences();
    afficherMessage("Sortie enregistrée avec succès.");
}

function modifierPresence(id) {
    const item = presences.find(x => x.id === id);
    if (!item) return;

    const nouveauxFrais = prompt('Modifier les frais :', item.frais ?? 0);
    if (nouveauxFrais === null) return;

    if (nouveauxFrais === '' || isNaN(Number(nouveauxFrais))) {
        alert('Modification invalide. Vérifiez le montant.');
        return;
    }

    item.frais = Number(nouveauxFrais);

    if (item.heureSortie) {
        item.heuresTravailMinutes = calculerMinutesTravail(
            item.dateArrivee || item.date,
            item.heureArrivee,
            item.dateSortie || '',
            item.heureSortie || '',
            item.totalPauseMinutes || 0
        );
        item.heuresTravail = formatMinutesToHM(item.heuresTravailMinutes || 0);
    }

    sauvegarder();
    afficherPresences();
    afficherMessage("Présence modifiée avec succès.");
}

function ouvrirModalModifierPersonnel(id) {
    const item = personnels.find(p => p.id === id);
    if (!item) return;

    const editId = document.getElementById('editPersonnelId');
    const editMatricule = document.getElementById('editMatriculePersonnel');
    const editNom = document.getElementById('editNomPersonnel');
    const editDepartement = document.getElementById('editDepartementPersonnel');

    if (editId) editId.value = item.id;
    if (editMatricule) editMatricule.value = item.matricule || '';
    if (editNom) editNom.value = item.nom || '';
    if (editDepartement) editDepartement.value = item.departement || '';

    if (window.bootstrap) {
        const modalEl = document.getElementById('modalModifierPersonnel');
        if (modalEl) {
            const modal = new bootstrap.Modal(modalEl);
            modal.show();
        }
    }
}

function validerModificationPersonnel() {
    const id = Number(document.getElementById('editPersonnelId')?.value);
    const item = personnels.find(p => p.id === id);
    if (!item) return;

    const nom = document.getElementById('editNomPersonnel')?.value.trim() || '';
    const departement = document.getElementById('editDepartementPersonnel')?.value || '';

    if (!nom || !departement) {
        alert('Merci de remplir tous les champs.');
        return;
    }

    item.nom = nom;
    item.departement = departement;

    presences.forEach(presence => {
        if (presence.personnelId === id) {
            presence.nom = nom;
            presence.departement = departement;
        }
    });

    sauvegarderPersonnels();
    sauvegarder();
    afficherPersonnels();
    chargerListePersonnel();
    remplirFiltreDepartement();
    afficherPresences();

    afficherMessage("Personnel modifié avec succès.");

    const modalElement = document.getElementById('modalModifierPersonnel');
    if (modalElement && window.bootstrap) {
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) modalInstance.hide();
    }
}

function supprimerPersonnel(id) {
    const utilise = presences.some(item => item.personnelId === id);
    if (utilise) {
        alert("Impossible de supprimer ce personnel car il est déjà utilisé dans les présences.");
        return;
    }

    if (!confirm("Voulez-vous vraiment supprimer ce personnel ?")) return;

    personnels = personnels.filter(item => item.id !== id);
    sauvegarderPersonnels();
    afficherPersonnels();
    chargerListePersonnel();
    remplirFiltreDepartement();
    afficherMessage("Personnel supprimé avec succès.", "warning");
}

function supprimerPresence(id) {
    const confirmation = confirm("Voulez-vous vraiment supprimer cette présence ?");
    if (!confirmation) return;

    presences = presences.filter(item => item.id !== id);
    sauvegarder();

    const totalPages = Math.max(1, Math.ceil(obtenirDonneesFiltrees().length / LIGNES_PAR_PAGE));
    if (pageActuelle > totalPages) {
        pageActuelle = totalPages;
    }

    afficherPresences();
    afficherMessage("Présence supprimée avec succès.", "warning");
}

function remplirFiltreDepartement() {
    const select = document.getElementById('filtreDepartement');
    if (!select) return;

    const valeurActuelle = select.value;
    const departements = [...new Set(personnels.map(p => p.departement).filter(Boolean))].sort();

    select.innerHTML = `<option value="">Tous les départements</option>`;

    departements.forEach(dep => {
        const option = document.createElement('option');
        option.value = dep;
        option.textContent = dep;
        select.appendChild(option);
    });

    if ([...select.options].some(opt => opt.value === valeurActuelle)) {
        select.value = valeurActuelle;
    }
}

function obtenirDonneesFiltrees() {
    const rechercheNom = document.getElementById('rechercheNom')?.value.trim().toLowerCase() || '';
    const filtreDepartement = document.getElementById('filtreDepartement')?.value || '';
    const filtreLocalisation = document.getElementById('filtreLocalisation')?.value || '';
    const dateDebut = document.getElementById('dateDebutFiltre')?.value || '';
    const dateFin = document.getElementById('dateFinFiltre')?.value || '';

    return presences.filter(item => {
        const dateReference = item.dateArrivee || item.date || '';

        const correspondRecherche =
            !rechercheNom ||
            (item.nom || '').toLowerCase().includes(rechercheNom) ||
            (item.matricule || '').toLowerCase().includes(rechercheNom);

        const correspondDepartement =
            !filtreDepartement || item.departement === filtreDepartement;

        const correspondLocalisation =
            !filtreLocalisation || item.localisation === filtreLocalisation;

        const correspondDateDebut =
            !dateDebut || dateReference >= dateDebut;

        const correspondDateFin =
            !dateFin || dateReference <= dateFin;

        return correspondRecherche &&
            correspondDepartement &&
            correspondLocalisation &&
            correspondDateDebut &&
            correspondDateFin;
    });
}

function obtenirPersonnelsFiltres() {
    const recherche = document.getElementById('recherchePersonnel')?.value.trim().toLowerCase() || '';

    return personnels.filter(item => {
        return !recherche ||
            (item.nom || '').toLowerCase().includes(recherche) ||
            (item.matricule || '').toLowerCase().includes(recherche) ||
            (item.departement || '').toLowerCase().includes(recherche);
    });
}

function afficherResumeFiltres(nb) {
    const zone = document.getElementById('resumeFiltres');
    if (!zone) return;

    const rechercheNom = document.getElementById('rechercheNom')?.value.trim() || '';
    const filtreDepartement = document.getElementById('filtreDepartement')?.value || '';
    const filtreLocalisation = document.getElementById('filtreLocalisation')?.value || '';
    const dateDebut = document.getElementById('dateDebutFiltre')?.value || '';
    const dateFin = document.getElementById('dateFinFiltre')?.value || '';

    const filtres = [];

    if (rechercheNom) filtres.push(`Recherche : ${rechercheNom}`);
    if (filtreDepartement) filtres.push(`Département : ${filtreDepartement}`);
    if (filtreLocalisation) filtres.push(`Position : ${filtreLocalisation}`);
    if (dateDebut) filtres.push(`Du : ${formatDate(dateDebut)}`);
    if (dateFin) filtres.push(`Au : ${formatDate(dateFin)}`);

    if (filtres.length === 0) {
        zone.innerHTML = `<strong>${nb}</strong> présence(s) affichée(s)`;
    } else {
        zone.innerHTML = `<strong>${nb}</strong> présence(s) affichée(s) | ${filtres.join(' | ')}`;
    }
}

function afficherPersonnels() {
    const zone = document.getElementById('tablePersonnel');
    if (!zone) return;

    const data = obtenirPersonnelsFiltres();

    if (data.length === 0) {
        zone.innerHTML = '<div class="empty">Aucun personnel trouvé.</div>';
        return;
    }

    let html = `
        <div class="table-responsive">
            <table class="table table-bordered table-striped">
                <thead>
                    <tr>
                        <th>Matricule</th>
                        <th>Nom</th>
                        <th>Département</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;

    data.forEach(item => {
        html += `
            <tr>
                <td data-label="Matricule">${item.matricule}</td>
                <td data-label="Nom">${item.nom}</td>
                <td data-label="Département">${item.departement}</td>
                <td data-label="Actions">
                    <div class="actions">
                        <button class="btn btn-secondary" onclick="ouvrirModalModifierPersonnel(${item.id})">Modifier</button>
                        <button class="btn btn-danger" onclick="supprimerPersonnel(${item.id})">Supprimer</button>
                    </div>
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;
    zone.innerHTML = html;
}

/* =========================
   PAGINATION
========================= */
function changerPage(page) {
    const data = obtenirDonneesFiltrees();
    const totalPages = Math.max(1, Math.ceil(data.length / LIGNES_PAR_PAGE));

    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;

    pageActuelle = page;
    afficherPresences();
}

function genererPagination(totalLignes) {
    const totalPages = Math.max(1, Math.ceil(totalLignes / LIGNES_PAR_PAGE));

    if (totalLignes === 0) return '';

    return `
        <div class="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
            <div>
                <small>Page ${pageActuelle} / ${totalPages}</small>
            </div>
            <div class="d-flex gap-2">
                <button class="btn btn-outline-primary btn-sm" onclick="changerPage(${pageActuelle - 1})" ${pageActuelle <= 1 ? 'disabled' : ''}>
                    Précédent
                </button>
                <button class="btn btn-outline-primary btn-sm" onclick="changerPage(${pageActuelle + 1})" ${pageActuelle >= totalPages ? 'disabled' : ''}>
                    Suivant
                </button>
            </div>
        </div>
    `;
}

function afficherPresences() {
    const data = obtenirDonneesFiltrees();
    const zone = document.getElementById('tableZone');
    if (!zone) return;

    afficherResumeFiltres(data.length);
    mettreAJourStats();

    if (data.length === 0) {
        pageActuelle = 1;
        zone.innerHTML = '<div class="empty">Aucune présence trouvée avec ces filtres.</div>';
        return;
    }

    const totalPages = Math.max(1, Math.ceil(data.length / LIGNES_PAR_PAGE));
    if (pageActuelle > totalPages) pageActuelle = totalPages;
    if (pageActuelle < 1) pageActuelle = 1;

    const debut = (pageActuelle - 1) * LIGNES_PAR_PAGE;
    const fin = debut + LIGNES_PAR_PAGE;
    const dataPage = data.slice(debut, fin);

    let html = `
        <div class="table-responsive">
            <table class="table table-bordered table-striped">
                <thead>
                    <tr>
                        <th>Matricule</th>
                        <th>Nom</th>
                        <th>Département</th>
                        <th>Position</th>
                        <th>Frais</th>
                        <th>Heure arrivée</th>
                        <th>Heure sortie</th>
                        <th>Total pause</th>
                        <th>Total travail</th>
                        <th>Date arrivée</th>
                        <th>Date sortie</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;

    dataPage.forEach(item => {
        const dateArrivee = item.dateArrivee || item.date || '';
        const dateSortie = item.dateSortie || '';

        html += `
            <tr>
                <td data-label="Matricule">${item.matricule || '-'}</td>
                <td data-label="Nom">${item.nom || '-'}</td>
                <td data-label="Département">${item.departement || '-'}</td>
                <td data-label="Position">${item.localisation || '-'}</td>
                <td data-label="Frais">${formatMontant(item.frais)} Ar</td>
                <td data-label="Heure arrivée">${item.heureArrivee || '-'}</td>
                <td data-label="Heure sortie">${item.heureSortie || '-'}</td>
                <td data-label="Total pause">
                    ${formatMinutesToHM(item.totalPauseMinutes || 0)}
                    ${item.pauseEnCours ? `<div class="badge-pause">En pause</div>` : ''}
                </td>
                <td data-label="Total travail">
                    ${item.heureSortie ? formatMinutesToHM(item.heuresTravailMinutes || 0) : '-'}
                </td>
                <td data-label="Date arrivée">${formatDate(dateArrivee)}</td>
                <td data-label="Date sortie">${formatDate(dateSortie)}</td>
                <td data-label="Actions">
                    <div class="actions">
                        <button class="btn btn-secondary" onclick="modifierPresence(${item.id})">Modifier</button>
                        <button class="btn btn-secondary" onclick="demarrerPause(${item.id})" ${item.heureSortie || item.pauseEnCours ? 'disabled' : ''}>Pause</button>
                        <button class="btn btn-primary" onclick="terminerPause(${item.id})" ${item.pauseEnCours ? '' : 'disabled'}>Retour pause</button>
                        <button class="btn btn-primary" onclick="ajouterSortie(${item.id})" ${item.heureSortie || item.pauseEnCours ? 'disabled' : ''}>
                            ${item.heureSortie ? 'Déjà sortie' : 'Sortie'}
                        </button>
                        <button class="btn btn-danger" onclick="supprimerPresence(${item.id})">Supprimer</button>
                    </div>
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
        ${genererPagination(data.length)}
    `;

    zone.innerHTML = html;
}

function mettreAJourStats() {
    const totalEl = document.getElementById('total');
    const totalFraisEl = document.getElementById('totalFrais');
    const nbJourEl = document.getElementById('nbJour');
    const heureMoyenneEl = document.getElementById('heureMoyenne');

    const data = obtenirDonneesFiltrees();

    if (totalEl) totalEl.textContent = data.length;

    const totalFrais = data.reduce((sum, item) => sum + (Number(item.frais) || 0), 0);
    if (totalFraisEl) totalFraisEl.textContent = formatMontant(totalFrais) + ' Ar';

    const joursUniques = new Set(
        data.map(x => x.dateArrivee || x.date).filter(Boolean)
    );
    if (nbJourEl) nbJourEl.textContent = joursUniques.size;

    const heures = data
        .map(x => x.heureArrivee)
        .filter(Boolean)
        .map(h => {
            const [hh, mm] = h.split(':').map(Number);
            return hh * 60 + mm;
        });

    if (heureMoyenneEl) {
        if (heures.length) {
            const moyenne = Math.round(heures.reduce((a, b) => a + b, 0) / heures.length);
            const hh = String(Math.floor(moyenne / 60)).padStart(2, '0');
            const mm = String(moyenne % 60).padStart(2, '0');
            heureMoyenneEl.textContent = `${hh}:${mm}`;
        } else {
            heureMoyenneEl.textContent = '--:--';
        }
    }
}

function exporterPDF() {
    const data = obtenirDonneesFiltrees();
    if (data.length === 0) {
        alert('Aucune donnée à exporter.');
        return;
    }

    const dateDebut = document.getElementById('dateDebutFiltre')?.value || '';
    const dateFin = document.getElementById('dateFinFiltre')?.value || '';

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text('Rapport de présence', 14, 15);

    doc.setFontSize(10);
    doc.text(`Date d'export : ${new Date().toLocaleString('fr-FR')}`, 14, 22);

    if (dateDebut || dateFin) {
        doc.text(`Période filtrée : ${dateDebut ? formatDate(dateDebut) : '---'} au ${dateFin ? formatDate(dateFin) : '---'}`, 14, 28);
    }

    const totalPersonnes = data.length;
    const totalFrais = data.reduce((sum, item) => sum + (Number(item.frais) || 0), 0);

    doc.text(`Nombre de présences : ${totalPersonnes}`, 14, 34);
    doc.text(`Total des frais : ${formatMontant(totalFrais)} Ar`, 14, 40);

    const rows = data.map(item => [
        item.matricule || '-',
        item.nom || '-',
        formatDate(item.dateArrivee || item.date || ''),
        item.heureArrivee || '-',
        formatDate(item.dateSortie || ''),
        item.heureSortie || '-',
        formatMinutesToHM(item.totalPauseMinutes || 0),
        item.heureSortie ? formatMinutesToHM(item.heuresTravailMinutes || 0) : '-',
        item.departement || '-',
        item.localisation || '-',
        formatMontant(item.frais) + ' Ar'
    ]);

    const head = [[
        'Matricule',
        'Nom',
        'Date arrivée',
        'Heure arrivée',
        'Date sortie',
        'Heure sortie',
        'Pause',
        'Travail',
        'Département',
        'Position',
        'Frais'
    ]];

    doc.autoTable({
        head: head,
        body: rows,
        startY: 47
    });

    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();

    const fileName = `rapport-presence-${day}-${month}-${year}.pdf`;
    doc.save(fileName);
}

function exporterExcel() {
    const data = obtenirDonneesFiltrees();

    if (data.length === 0) {
        alert('Aucune donnée à exporter en Excel.');
        return;
    }

    const rechercheNom = document.getElementById('rechercheNom')?.value.trim() || '';
    const filtreDepartement = document.getElementById('filtreDepartement')?.value || '';
    const filtreLocalisation = document.getElementById('filtreLocalisation')?.value || '';
    const dateDebut = document.getElementById('dateDebutFiltre')?.value || '';
    const dateFin = document.getElementById('dateFinFiltre')?.value || '';

    const donneesExcel = data.map(item => {
        const dateArrivee = item.dateArrivee || item.date || '';
        const dateSortie = item.dateSortie || '';

        return {
            Matricule: item.matricule || '-',
            Nom: item.nom || '-',
            Département: item.departement || '-',
            Position: item.localisation || '-',
            "Date arrivée": formatDate(dateArrivee),
            "Heure arrivée": item.heureArrivee || '-',
            "Date sortie": formatDate(dateSortie),
            "Heure sortie": item.heureSortie || '-',
            "Total pause": formatMinutesToHM(item.totalPauseMinutes || 0),
            "Total travail": item.heureSortie ? formatMinutesToHM(item.heuresTravailMinutes || 0) : '-',
            "Frais (Ar)": Number(item.frais) || 0
        };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(donneesExcel);

    ws['!cols'] = [
        { wch: 12 },
        { wch: 25 },
        { wch: 18 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 14 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Présences');

    const totalFrais = data.reduce((sum, item) => sum + (Number(item.frais) || 0), 0);

    const resume = [
        ["Rapport de présence"],
        ["Date d'export", new Date().toLocaleString('fr-FR')],
        ["Recherche", rechercheNom || "Tous"],
        ["Département", filtreDepartement || "Tous"],
        ["Position", filtreLocalisation || "Toutes"],
        ["Date début", dateDebut ? formatDate(dateDebut) : "---"],
        ["Date fin", dateFin ? formatDate(dateFin) : "---"],
        ["Nombre de présences", data.length],
        ["Total des frais", `${formatMontant(totalFrais)} Ar`]
    ];

    const wsResume = XLSX.utils.aoa_to_sheet(resume);
    wsResume['!cols'] = [{ wch: 20 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsResume, 'Résumé');

    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();

    const fileName = `rapport-presence-${day}-${month}-${year}.xlsx`;
    XLSX.writeFile(wb, fileName);
}

function imprimerPresencesFiltrees() {
    const data = obtenirDonneesFiltrees();

    if (data.length === 0) {
        alert('Aucune donnée à imprimer.');
        return;
    }

    const rechercheNom = document.getElementById('rechercheNom')?.value.trim() || '';
    const filtreDepartement = document.getElementById('filtreDepartement')?.value || '';
    const filtreLocalisation = document.getElementById('filtreLocalisation')?.value || '';
    const dateDebut = document.getElementById('dateDebutFiltre')?.value || '';
    const dateFin = document.getElementById('dateFinFiltre')?.value || '';

    const infosFiltres = [];
    if (rechercheNom) infosFiltres.push(`Recherche : ${rechercheNom}`);
    if (filtreDepartement) infosFiltres.push(`Département : ${filtreDepartement}`);
    if (filtreLocalisation) infosFiltres.push(`Position : ${filtreLocalisation}`);
    if (dateDebut) infosFiltres.push(`Du : ${formatDate(dateDebut)}`);
    if (dateFin) infosFiltres.push(`Au : ${formatDate(dateFin)}`);

    const lignes = data.map(item => `
        <tr>
            <td>${item.matricule || '-'}</td>
            <td>${item.nom || '-'}</td>
            <td>${item.departement || '-'}</td>
            <td>${item.localisation || '-'}</td>
            <td>${formatMontant(item.frais)} Ar</td>
            <td>${formatDate(item.dateArrivee || item.date || '')}</td>
            <td>${item.heureArrivee || '-'}</td>
            <td>${formatDate(item.dateSortie || '')}</td>
            <td>${item.heureSortie || '-'}</td>
            <td>${formatMinutesToHM(item.totalPauseMinutes || 0)}</td>
            <td>${item.heureSortie ? formatMinutesToHM(item.heuresTravailMinutes || 0) : '-'}</td>
        </tr>
    `).join('');

    const contenu = `
        <html>
        <head>
            <title>Impression présences filtrées</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                    color: #222;
                }
                h2 {
                    margin-bottom: 10px;
                }
                .meta {
                    margin-bottom: 15px;
                    font-size: 14px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 15px;
                }
                th, td {
                    border: 1px solid #ccc;
                    padding: 8px;
                    font-size: 12px;
                    text-align: left;
                }
                th {
                    background: #f1f1f1;
                }
            </style>
        </head>
        <body>
            <h2>Liste des présences filtrées</h2>
            <div class="meta"><strong>Date d'impression :</strong> ${new Date().toLocaleString('fr-FR')}</div>
            <div class="meta"><strong>Filtres :</strong> ${infosFiltres.length ? infosFiltres.join(' | ') : 'Tous'}</div>
            <div class="meta"><strong>Nombre de lignes :</strong> ${data.length}</div>

            <table>
                <thead>
                    <tr>
                        <th>Matricule</th>
                        <th>Nom</th>
                        <th>Département</th>
                        <th>Position</th>
                        <th>Frais</th>
                        <th>Date arrivée</th>
                        <th>Heure arrivée</th>
                        <th>Date sortie</th>
                        <th>Heure sortie</th>
                        <th>Total pause</th>
                        <th>Total travail</th>
                    </tr>
                </thead>
                <tbody>
                    ${lignes}
                </tbody>
            </table>
        </body>
        </html>
    `;

    const fenetre = window.open('', '_blank');
    fenetre.document.open();
    fenetre.document.write(contenu);
    fenetre.document.close();
    fenetre.focus();
    fenetre.print();
}

function reinitialiserFiltres() {
    const rechercheNom = document.getElementById('rechercheNom');
    const filtreDepartement = document.getElementById('filtreDepartement');
    const filtreLocalisation = document.getElementById('filtreLocalisation');
    const dateDebutFiltre = document.getElementById('dateDebutFiltre');
    const dateFinFiltre = document.getElementById('dateFinFiltre');

    if (rechercheNom) rechercheNom.value = '';
    if (filtreDepartement) filtreDepartement.value = '';
    if (filtreLocalisation) filtreLocalisation.value = '';
    if (dateDebutFiltre) dateDebutFiltre.value = getDateAujourdhui();
    if (dateFinFiltre) dateFinFiltre.value = getDateAujourdhui();

    pageActuelle = 1;
    afficherPresences();
}

function exporterDonneesJSON() {
    const data = {
        personnels: personnels,
        presences: presences
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json"
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();

    a.href = url;
    a.download = `sauvegarde-presences-${day}-${month}-${year}.json`;
    a.click();

    URL.revokeObjectURL(url);
}

function importerDonneesJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);

            if (!data || typeof data !== 'object') {
                throw new Error('Format invalide');
            }

            personnels = Array.isArray(data.personnels) ? data.personnels : [];
            presences = Array.isArray(data.presences) ? data.presences : [];

            migrerAnciennesDonnees();
            sauvegarderPersonnels();
            sauvegarder();

            chargerListePersonnel();
            remplirFiltreDepartement();
            afficherPersonnels();

            const personnelSelect = document.getElementById('personnelSelect');
            const matricule = document.getElementById('matriculeAffiche');
            const nom = document.getElementById('nom');
            const departement = document.getElementById('departement');
            const localisation = document.getElementById('localisation');
            const frais = document.getElementById('frais');

            if (personnelSelect) personnelSelect.value = '';
            if (matricule) matricule.value = '';
            if (nom) nom.value = '';
            if (departement) departement.value = '';
            if (localisation) localisation.value = '';
            if (frais) frais.value = '';

            pageActuelle = 1;
            afficherPresences();
            afficherMessage('Données importées avec succès.');
        } catch (error) {
            alert('Fichier JSON invalide.');
        }

        event.target.value = '';
    };

    reader.readAsText(file);
}

function viderDonnees() {
    if (!confirm('Voulez-vous vraiment supprimer toutes les présences ?')) return;

    presences = [];
    sauvegarder();

    const personnelSelect = document.getElementById('personnelSelect');
    const matricule = document.getElementById('matriculeAffiche');
    const nom = document.getElementById('nom');
    const departement = document.getElementById('departement');
    const localisation = document.getElementById('localisation');
    const frais = document.getElementById('frais');

    if (personnelSelect) personnelSelect.value = '';
    if (matricule) matricule.value = '';
    if (nom) nom.value = '';
    if (departement) departement.value = '';
    if (localisation) localisation.value = '';
    if (frais) frais.value = '';

    pageActuelle = 1;
    afficherPresences();
    afficherMessage("Toutes les présences ont été supprimées.", "warning");
}

function deconnexion() {
    sessionStorage.removeItem("slmi_user");
    window.location.href = "../index.html";
}

/* =========================
   TEMPS RÉEL
========================= */
function rechargerDepuisLocalStorage() {
    presences = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    personnels = JSON.parse(localStorage.getItem(PERSONNEL_KEY)) || [];
}

function rafraichirInterface() {
    rechargerDepuisLocalStorage();
    mettreHeureActuelle();
    mettreDateAujourdhuiSiVideOuAuto();
    remplirFiltreDepartement();
    chargerListePersonnel();
    afficherPersonnels();
    afficherPresences();
}

window.addEventListener('storage', function (event) {
    if (event.key === STORAGE_KEY || event.key === PERSONNEL_KEY) {
        rafraichirInterface();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const datePresence = document.getElementById('datePresence');
    const dateDebutFiltreInit = document.getElementById('dateDebutFiltre');
    const dateFinFiltreInit = document.getElementById('dateFinFiltre');
    const personnelSelect = document.getElementById('personnelSelect');

    if (datePresence) {
        datePresence.value = getDateAujourdhui();
        datePresence.dataset.auto = "true";

        datePresence.addEventListener('input', function () {
            this.dataset.auto = "false";
        });
    }

    if (dateDebutFiltreInit) dateDebutFiltreInit.value = getDateAujourdhui();
    if (dateFinFiltreInit) dateFinFiltreInit.value = getDateAujourdhui();

    if (personnelSelect) {
        personnelSelect.addEventListener('change', remplirInfosPersonnel);
    }

    ['rechercheNom', 'filtreDepartement', 'filtreLocalisation', 'dateDebutFiltre', 'dateFinFiltre'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;

        const eventType = (el.tagName === 'INPUT' && el.type !== 'date') ? 'input' : 'change';

        el.addEventListener(eventType, () => {
            pageActuelle = 1;
            afficherPresences();
        });
    });

    const recherchePersonnel = document.getElementById('recherchePersonnel');
    if (recherchePersonnel) {
        recherchePersonnel.addEventListener('input', afficherPersonnels);
    }

    migrerAnciennesDonnees();
    chargerListePersonnel();
    remplirFiltreDepartement();
    afficherPersonnels();
    afficherPresences();
    mettreHeureActuelle();

    setInterval(() => {
        mettreHeureActuelle();
        mettreDateAujourdhuiSiVideOuAuto();
    }, 1000);

    setInterval(() => {
        rafraichirInterface();
    }, 3000);
});

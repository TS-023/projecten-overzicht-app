// ============================================================
//  MVSA · Supabase config — vervang deze twee waarden
//  na het aanmaken van je project op supabase.com
// ============================================================
const SUPABASE_URL  = 'https://rrxglrrrijgfyvinbmwu.supabase.co';
const SUPABASE_ANON = 'sb_publishable_xlvYAi683npTSAOLz1CgRw_1HT2EZ-T';

// Supabase client (geladen via CDN in elke HTML pagina)
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);

// ============================================================
//  Hulpfuncties — drop-in vervanging voor localStorage
// ============================================================
const Projects = {
  async getAll() {
    const { data, error } = await db.from('projects').select('*').order('created_at', { ascending: false });
    if (error) { console.error('getAll:', error); return []; }
    return data;
  },
  async getByName(name) {
    const { data, error } = await db.from('projects').select('*')
      .ilike('projectnaam', name).limit(1).single();
    if (error) return null;
    return data;
  },
  async getByNumber(nummer) {
    const { data, error } = await db.from('projects').select('*')
      .eq('projectnummer', nummer).limit(1).single();
    if (error) return null;
    return data;
  },
  async upsert(project) {
    // Als projectnummer bestaat → update; anders → insert
    const { data, error } = await db.from('projects')
      .upsert(project, { onConflict: 'projectnummer' })
      .select().single();
    if (error) { console.error('upsert:', error); throw error; }
    return data;
  },
  async remove(id) {
    const { error } = await db.from('projects').delete().eq('id', id);
    if (error) { console.error('remove:', error); throw error; }
  }
};

const Employees = {
  // Alle werknemers ophalen uit profiles (enige bron van waarheid)
  async getAll() {
    const { data, error } = await db.from('profiles')
      .select('id, naam, rol, team, score, projecten, email')
      .not('naam', 'is', null)
      .eq('status', 'approved')
      .order('score', { ascending: false });
    if (error) { console.error('profiles:', error); return []; }
    return data || [];
  },

  // Punten toevoegen aan de ingelogde gebruiker
  async addPoints(points = 1) {
    try {
      const { data: { user } } = await db.auth.getUser();
      if (!user) return;
      const { data: profile } = await db.from('profiles')
        .select('id, score').eq('id', user.id).maybeSingle();
      if (!profile) return;
      await db.from('profiles').update({ score: (profile.score || 0) + points }).eq('id', user.id);
    } catch(e) { console.warn('addPoints fout:', e); }
  },

  // Leaderboard ophalen gesorteerd op score
  async getLeaderboard(limit = 10) {
    const { data } = await db.from('profiles')
      .select('id, naam, score, projecten, team, rol')
      .not('naam', 'is', null)
      .eq('status', 'approved')
      .order('score', { ascending: false })
      .limit(limit);
    return (data || []).map(e => ({
      id:       e.id,
      name:     e.naam || '—',
      score:    e.score || 0,
      projects: e.projecten || 0,
      team:     e.team || '',
      role:     e.rol || '',
    }));
  },

  // Projecten teller verhogen voor de ingelogde gebruiker
  async incrementProjects() {
    try {
      const { data: { user } } = await db.auth.getUser();
      if (!user) return;
      const { data: profile } = await db.from('profiles')
        .select('id, projecten').eq('id', user.id).maybeSingle();
      if (!profile) return;
      await db.from('profiles').update({ projecten: (profile.projecten || 0) + 1 }).eq('id', user.id);
    } catch(e) { console.warn('incrementProjects fout:', e); }
  },
};

// ============================================================
//  Afbeeldingen via Supabase Storage (bucket: "project-images")
// ============================================================
const Images = {
  // Upload één bestand, geeft publieke URL terug
  async upload(projectNummer, file) {
    const ext = file.name.split('.').pop();
    const path = `${projectNummer}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await db.storage.from('project-images').upload(path, file, {
      cacheControl: '3600', upsert: false,
    });
    if (error) throw error;
    const { data } = db.storage.from('project-images').getPublicUrl(path);
    return data.publicUrl;
  },

  // Haal alle publieke URLs op voor een project
  async getForProject(projectNummer) {
    const { data, error } = await db.storage.from('project-images').list(projectNummer, {
      sortBy: { column: 'created_at', order: 'asc' },
    });
    if (error || !data) return [];
    return data.map(f => {
      const { data: u } = db.storage.from('project-images').getPublicUrl(`${projectNummer}/${f.name}`);
      return u.publicUrl;
    });
  },

  // Verwijder één afbeelding op basis van volledige URL
  async remove(url) {
    const path = url.split('/project-images/')[1];
    if (!path) return;
    await db.storage.from('project-images').remove([path]);
  }
};

// ============================================================
//  Werknemers afbeeldingen (bucket: "employee-images")
// ============================================================
const EmployeeImages = {
  async upload(employeeId, file) {
    const ext = file.name.split('.').pop();
    const path = `${employeeId}/photo.${ext}`;
    // Verwijder eerst oude foto
    await db.storage.from('employee-images').remove([path]);
    const { error } = await db.storage.from('employee-images').upload(path, file, {
      cacheControl: '3600', upsert: true,
    });
    if (error) throw error;
    const { data } = db.storage.from('employee-images').getPublicUrl(path);
    return data.publicUrl;
  },

  getUrl(employeeId, ext = 'jpg') {
    const { data } = db.storage.from('employee-images').getPublicUrl(`${employeeId}/photo.${ext}`);
    return data.publicUrl;
  },

  async getForEmployee(employeeId) {
    const { data, error } = await db.storage.from('employee-images').list(String(employeeId));
    if (error || !data || !data.length) return null;
    const { data: u } = db.storage.from('employee-images').getPublicUrl(`${employeeId}/${data[0].name}`);
    return u.publicUrl;
  }
};

// ============================================================
//  AUTH — inloggen, registreren, sessie beheren
// ============================================================
const Auth = {
  // Huidige ingelogde gebruiker
  async getUser() {
    const { data: { user } } = await db.auth.getUser();
    return user;
  },

  // Profiel ophalen (inclusief status)
  async getProfile(userId) {
    const { data } = await db.from('profiles').select('*').eq('id', userId).maybeSingle();
    return data;
  },

  // Registreren
  async register(email, password, naam, team) {
    const { data, error } = await db.auth.signUp({ email, password });
    if (error) throw error;

    // Haal user op — bij uitgeschakelde email confirmatie is die direct beschikbaar
    const user = data.user || (await db.auth.getUser()).data.user;
    if (!user) throw new Error('Registratie mislukt. Probeer opnieuw.');

    // Check of profiel al bestaat (voorkom dubbele insert)
    const { data: existing_profile } = await db.from('profiles')
      .select('id').eq('id', user.id).maybeSingle();

    if (!existing_profile) {
      // Maak profiel aan
      const { error: profileError } = await db.from('profiles').insert([{
        id: user.id,
        naam: naam.trim(),
        email,
        team,
        status: 'pending',
        score: 0,
        projecten: 0,
      }]);

      if (profileError) {
        console.error('Profiel aanmaken mislukt:', profileError);
        throw new Error('Account aangemaakt maar profiel kon niet worden opgeslagen. Neem contact op met de beheerder.');
      }
    }

    return data;
  },

  // Inloggen
  async login(email, password) {
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  // Uitloggen
  async logout() {
    await db.auth.signOut();
  },

  // Sessie bewaken
  onAuthChange(callback) {
    return db.auth.onAuthStateChange(callback);
  },

  // Check of gebruiker approved is
  async isApproved() {
    const user = await this.getUser();
    if (!user) return false;
    const profile = await this.getProfile(user.id);
    return profile?.status === 'approved';
  },

  // Check of gebruiker beheerder is
  async isAdmin() {
    const user = await this.getUser();
    if (!user) return false;
    const profile = await this.getProfile(user.id);
    return profile?.status === 'approved' && profile?.is_admin === true;
  },
};

// ============================================================
//  BEHEER — aanmeldingen goedkeuren/afkeuren
// ============================================================
const AdminAuth = {
  // Alle aanmeldingen ophalen
  async getPending() {
    const { data } = await db.from('profiles')
      .select('*').eq('status', 'pending')
      .order('created_at', { ascending: true });
    return data || [];
  },

  async getAll() {
    const { data } = await db.from('profiles')
      .select('*').order('created_at', { ascending: false });
    return data || [];
  },

  // Goedkeuren
  async approve(profileId) {
    const { data: profile } = await db.from('profiles')
      .select('*').eq('id', profileId).maybeSingle();
    await db.from('profiles').update({
      status: 'approved',
      approved_at: new Date().toISOString(),
    }).eq('id', profileId);

  },

  // Afkeuren
  async reject(profileId) {
    await db.from('profiles').update({
      status: 'rejected',
    }).eq('id', profileId);
  },

  // Verwijderen (zonder mail — intern gebruik)
  async remove(profileId) {
    await db.from('profiles').delete().eq('id', profileId);
  },

  // Gebruiker uitnodigen via Edge Function (verstuurt uitnodigingsmail)
  async inviteUser(email, naam, team) {
    const { data: { session } } = await db.auth.getSession();
    const token = session?.access_token;
    const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_ANON,
      },
      body: JSON.stringify({ action: 'invite', email, naam, team }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Uitnodigen mislukt');
    return data;
  },

  // Gebruiker verwijderen met motivatie-mail via Edge Function
  async deleteWithReason(userId, motivatie) {
    const { data: { session } } = await db.auth.getSession();
    const token = session?.access_token;
    const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_ANON,
      },
      body: JSON.stringify({ action: 'delete', userId, motivatie }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Verwijderen mislukt');
    return data;
  },
};


// autoLinkEmployee verwijderd — profiles is nu de enige bron van waarheid

// ============================================================
//  SESSIE TIMEOUT — automatisch uitloggen na 1 uur
// ============================================================
(function(){
  const SESSION_TIMEOUT = 60 * 60 * 1000; // 1 uur in ms
  const SESSION_KEY = 'mvsa.lastActivity';

  function updateActivity(){
    localStorage.setItem(SESSION_KEY, Date.now().toString());
  }

  function checkTimeout(){
    const last = parseInt(localStorage.getItem(SESSION_KEY) || '0');
    if (last && (Date.now() - last) > SESSION_TIMEOUT) {
      // Sessie verlopen — uitloggen
      localStorage.removeItem(SESSION_KEY);
      db.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          db.auth.signOut().then(() => {
            if (!window.location.pathname.includes('login.html')) {
              window.location.href = 'login.html';
            }
          });
        }
      });
    }
  }

  // Check bij laden
  checkTimeout();

  // Update activiteit bij interactie
  ['click', 'keydown', 'scroll', 'mousemove'].forEach(evt => {
    document.addEventListener(evt, updateActivity, { passive: true });
  });

  // Zet initiële activiteit
  updateActivity();

  // Check elke minuut
  setInterval(checkTimeout, 60 * 1000);
})();

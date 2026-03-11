import { useState, useEffect, useRef } from 'react';
import VersionCard from './components/VersionCard';

export const getTocInterface = (versionName) => {
  if (!versionName) return "N/A";
  const parts = versionName.split('.');
  if (parts.length < 3) return "N/A";

  const major = parseInt(parts[0], 10) || 0;
  const minor = parseInt(parts[1], 10) || 0;
  const patch = parseInt(parts[2], 10) || 0;

  return ((major * 10000) + (minor * 100) + patch).toString();
};

function App() {
  const [selectedCards, setSelectedCards] = useState(() => {
    try {
      const saved = localStorage.getItem('selectedCards');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error("Failed to parse selectedCards from localStorage", error);
      return {};
    }
  });
  const [wowProducts, setWowProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [globalRegion, setGlobalRegion] = useState('eu');
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const hasProcessedOAuth = useRef(false);

  useEffect(() => {
    fetch('/api/v1/products')
      .then(res => res.json())
      .then(data => setWowProducts(data.products || []))
      .catch(err => console.error("Failed to load products", err))
      .finally(() => setLoadingProducts(false));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const installationId = params.get('installation_id');

    if ((code || installationId) && !hasProcessedOAuth.current) {
      hasProcessedOAuth.current = true;
      // Redirect to backend to process login/installation.
      // The backend will set the cookie and redirect back to the frontend.
      // On the next load, the 'else' block will run.
      // isAuthLoading remains true during this.
      window.location.href = `/api/v1/auth/github/callback?${params.toString()}`;
    } else if (!code && !installationId) {
      // This is a normal page load or a redirect back from the backend.
      // Check if we have a valid session cookie.
      fetch('/api/v1/auth/me', {
        credentials: 'include'
      })
        .then(res => (res.ok ? res.json() : null))
        .then(userData => setUser(userData))
        .finally(() => setIsAuthLoading(false)); // We're done checking auth.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('selectedCards', JSON.stringify(selectedCards));
    } catch (error) {
      console.error("Failed to save selectedCards to localStorage", error);
    }
  }, [selectedCards]);

  const handleToggleCard = (product, region, versionName) => {
    const cardId = `${product}-${region}-${versionName}`;
    const tocValue = getTocInterface(versionName);

    setSelectedCards(prev => {
      const newState = { ...prev };
      if (newState[cardId]) {
        delete newState[cardId];
      } else {
        newState[cardId] = tocValue;
      }
      return newState;
    });
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' });
      setUser(null);
      window.location.href = '/';
    } catch (error) {
      console.error("Failed to logout", error);
    }
  };

  const uniqueTocs = [...new Set(Object.values(selectedCards).filter(t => t !== "N/A"))];
  const tocDisplayString = uniqueTocs.length > 0
    ? `## Interface: ${uniqueTocs.join(', ')}`
    : "## Interface: (Select versions below)";

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-base-100 gap-4">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <h2 className="text-xl font-bold opacity-50">Authenticating GitHub user...</h2>
      </div>
    );
  }
    
  return (
    <div className="container mx-auto max-w-5xl p-4 sm:p-8 min-h-screen">
      <header className="text-center mb-10">
        <div className="absolute top-4 right-4">
          {user ? (
            <div className="flex items-center gap-3 bg-base-200 px-4 py-2 rounded-full shadow-sm">
              <span className="text-sm font-semibold">Hi, {user.username}</span>
              <div className="avatar placeholder">
                <div className="bg-neutral text-neutral-content rounded-full w-8">
                  <span className="text-xs">{user.username.substring(0, 2).toUpperCase()}</span>
                </div>
              </div>
              <button onClick={handleLogout} className="btn btn-ghost btn-xs text-error">
                Logout
              </button>
            </div>
          ) : (
            <a href="/api/v1/auth/github/login" className="btn btn-primary btn-sm gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
              </svg>
              Login
            </a>
          )}
        </div>

        {user ? (
          <h1 className="text-4xl md:text-5xl font-extrabold mb-3">WoW Version Tracker (Logged In)</h1>
        ) : (
          <h1 className="text-4xl md:text-5xl font-extrabold mb-3">WoW Version Tracker</h1>
        )}
        {/*<h1 className="text-4xl md:text-5xl font-extrabold mb-3">WoW Version Tracker</h1>*/}
        <p className="text-base-content/70">Select multiple versions to generate your TOC Interface tags.</p>

        <div className="max-w-2xl mx-auto mt-8 flex flex-col items-center gap-4">
          <input
            type="text"
            readOnly
            value={tocDisplayString}
            className="input input-bordered input-lg w-full text-center font-mono text-success font-bold bg-base-200 cursor-default focus:outline-none"
          />

          <div className="flex items-center gap-3">
            <span className="font-semibold text-sm uppercase tracking-wide opacity-70">Global Region:</span>
            <select
              value={globalRegion}
              onChange={(e) => setGlobalRegion(e.target.value)}
              className="select select-bordered select-sm w-32"
            >
              <option value="us">US</option>
              <option value="eu">EU</option>
              <option value="kr">KR</option>
              <option value="tw">TW</option>
              <option value="cn">CN</option>
            </select>
          </div>
        </div>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {loadingProducts ? (
          <div className="flex justify-center items-center py-10 col-span-full">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
        ) : (
          wowProducts.map(productName => (
            <VersionCard
              key={productName}
              product={productName}
              selectedCards={selectedCards}
              onToggle={handleToggleCard}
              globalRegion={globalRegion}
            />
          ))
        )}
      </main>
    </div>
  );
}

export default App;
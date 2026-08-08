import React, { useEffect, useMemo, useState, useRef } from "react";
import * as XLSX from "xlsx";
import './SuperAdminDashboard.css';
import usePageTitle from '../usePageTitle';
import ptagLogo from '../assets/PTag.png';

const BASE_URL = "https://anpr-api.gconnectt.com";

const SuperAdminDashboard = ({ user }) => {
  usePageTitle("Super-Admin Dashboard");

  const [logs,               setLogs]               = useState([]);
  const [filtered,           setFiltered]           = useState([]);
  const [from,               setFrom]               = useState("");
  const [to,                 setTo]                 = useState("");
  const [branch,             setBranch]             = useState("ALL");
  const [branches,           setBranches]           = useState([]);
  const [search,             setSearch]             = useState("");
  const [activeTab,          setActiveTab]          = useState("logs");
  const [branchUsers,        setBranchUsers]        = useState([]);
  const [allBranches,        setAllBranches]        = useState([]);
  const [showForm,           setShowForm]           = useState(false);
  const [backendUrl,         setBackendUrl]         = useState(BASE_URL);
  const [newUser,            setNewUser]            = useState({
    branchName: "", location: "", userName: "", password: ""
  });
  const [assignModal,        setAssignModal]        = useState(null);
  const [selectedBranchIds,  setSelectedBranchIds]  = useState([]);
  const [hoveredPlate,       setHoveredPlate]       = useState(null);
  const [userCard,           setUserCard]           = useState(null);
  const [cardPos,            setCardPos]            = useState({ x: 0, y: 0 });
  const [deleteModal,        setDeleteModal]        = useState(null);
  const [avatarMenuOpen,     setAvatarMenuOpen]     = useState(false);
  const [visiblePassFor,     setVisiblePassFor]     = useState(null);
  const [plainPasswords,     setPlainPasswords]     = useState({});

  // ✅ Insurance states
  const [regUsers,       setRegUsers]       = useState([]);
  const [usersLoading,   setUsersLoading]   = useState(false);
  const [userSearch,     setUserSearch]     = useState("");
  const [insuranceModal, setInsuranceModal] = useState(null);
  const [insuranceForm,  setInsuranceForm]  = useState({
    insuranceStatus: "PENDING", insuranceCompany: "", insuranceExpiry: "", insuranceNote: ""
  });
  const [insuranceMsg,   setInsuranceMsg]   = useState("");
  const [insuranceFilter, setInsuranceFilter] = useState("ALL");
  const [fetchingInsurance, setFetchingInsurance] = useState(null);

  const hoverTimer = useRef(null);
  const avatarRef  = useRef(null);

  const token = localStorage.getItem("superAdminToken");
  const headers = useMemo(() => ({
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true"
  }), [token]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target))
        setAvatarMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("superAdminToken");
    window.location.href = "/super-admin/login";
  };

  useEffect(() => {
    fetch(`${BASE_URL}/super-admin/logs`, { headers })
      .then(res => res.json())
      .then(data => { setLogs(data); setFiltered(data); })
      .catch(err => console.error(err));
  }, [headers]);

  useEffect(() => {
    fetch(`${BASE_URL}/super-admin/branch-users`, { headers })
      .then(res => res.json())
      .then(data => setBranchUsers(data))
      .catch(err => console.error(err));
  }, [headers]);

  useEffect(() => {
    fetch(`${BASE_URL}/super-admin/all-branches`, { headers })
      .then(res => res.json())
      .then(data => {
        setAllBranches(data);
        const names = [...new Set(data.map(b => b.branchName).filter(Boolean))].sort();
        setBranches(names);
      })
      .catch(err => console.error(err));
  }, [headers]);

  // ✅ Fetch registered users when tab opens
  useEffect(() => {
    if (activeTab !== "users") return;
    setUsersLoading(true);
    fetch(`${BASE_URL}/super-admin/users`, { headers })
      .then(res => res.json())
      .then(data => setRegUsers(Array.isArray(data) ? data : []))
      .catch(err => console.error(err))
      .finally(() => setUsersLoading(false));
  }, [activeTab, headers]);

  const applyFilters = (logsArr, fromVal, toVal, branchVal, searchVal) => {
    let result = [...logsArr];
    if (fromVal && toVal) {
      const fromDate = new Date(fromVal);
      const toDate   = new Date(toVal); toDate.setHours(23, 59, 59);
      result = result.filter(log => {
        const d = new Date(log.entryTime);
        return d >= fromDate && d <= toDate;
      });
    }
    if (branchVal && branchVal !== "ALL")
      result = result.filter(log => log.branch?.branchName === branchVal);
    if (searchVal && searchVal.trim() !== "")
      result = result.filter(log =>
        log.plateNumber?.toUpperCase().includes(searchVal.toUpperCase().trim()));
    return result;
  };

  const handleFilter = () => setFiltered(applyFilters(logs, from, to, branch, search));
  const handleReset  = () => { setFrom(""); setTo(""); setBranch("ALL"); setSearch(""); setFiltered(logs); };
  const handleSearch = (e) => { const val = e.target.value; setSearch(val); setFiltered(applyFilters(logs, from, to, branch, val)); };

  const totalRevenue  = filtered.reduce((sum, log) => sum + (log.price ?? 0), 0);
  const branchRevenue = filtered.reduce((acc, log) => {
    const name = log.branch?.branchName ?? "Unknown";
    acc[name] = (acc[name] ?? 0) + (log.price ?? 0);
    return acc;
  }, {});

  const downloadExcel = () => {
    const exportData = filtered.map((log, i) => ({
      "S.No": i + 1, "Plate Number": log.plateNumber, "Branch": log.branch?.branchName ?? "-",
      "Entry Time": log.entryTime ? formatDateTime(log.entryTime) : "-",
      "Exit Time":  log.exitTime  ? formatDateTime(log.exitTime)  : "-",
      "Status": log.inside ? "Inside" : "Exited",
      "Price (Rs)": log.price != null ? log.price.toFixed(0) : "-"
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vehicle Logs");
    XLSX.writeFile(wb, "vehicle_logs.xlsx");
  };

  const createBranchUser = () => {
    fetch(`${BASE_URL}/super-admin/branch-users`, { method: "POST", headers, body: JSON.stringify(newUser) })
      .then(res => res.json())
      .then(data => {
        setBranchUsers(prev => [...prev, data]);
        setNewUser({ branchName: "", location: "", userName: "", password: "" });
        setShowForm(false);
        alert("Branch user created successfully!");
      }).catch(err => console.error(err));
  };

  const deleteBranchUser = (id) => {
    fetch(`${BASE_URL}/super-admin/branch-users/${id}`, { method: "DELETE", headers })
      .then(() => { setBranchUsers(prev => prev.filter(u => u.id !== id)); setDeleteModal(null); })
      .catch(err => console.error(err));
  };

  const downloadConfig = async (id) => {
    try {
      const res  = await fetch(`${BASE_URL}/super-admin/branch-users/${id}/download-config?backendUrl=${encodeURIComponent(backendUrl)}`, { headers });
      const blob = await res.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `config_${id}.ini`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); window.URL.revokeObjectURL(url);
    } catch (err) { alert("Download failed: " + err.message); }
  };

  const resetPassword = async (id) => {
    if (!window.confirm("Generate a new temporary password?")) return;
    try {
      const res  = await fetch(`${BASE_URL}/super-admin/branch-users/${id}/reset-password`, { method: "POST", headers });
      const text = await res.text();
      let data   = {}; try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
      if (!res.ok) { alert(`Failed: ${data.error || res.status}`); return; }
      setPlainPasswords(prev => ({ ...prev, [id]: data.temporaryPassword }));
      setVisiblePassFor(id);
      alert(`✅ Temporary Password: ${data.temporaryPassword}`);
    } catch (err) { alert("Password reset failed: " + err.message); }
  };

  const openAssignModal = (u) => {
    setAssignModal(u);
    setSelectedBranchIds((u.branches || []).filter(b => allBranches.some(ab => ab.id === b.id)).map(b => b.id));
  };

  const saveAssignment = () => {
    fetch(`${BASE_URL}/super-admin/branch-users/${assignModal.id}/assign-branches`, {
      method: "PUT", headers, body: JSON.stringify({ branchIds: selectedBranchIds })
    }).then(res => res.json()).then(() => {
      alert("Branches assigned successfully!"); setAssignModal(null);
      fetch(`${BASE_URL}/super-admin/branch-users`, { headers }).then(r => r.json()).then(data => setBranchUsers(data));
    }).catch(err => console.error(err));
  };

  const toggleBranchSelection = (branchId) => {
    setSelectedBranchIds(prev => prev.includes(branchId) ? prev.filter(id => id !== branchId) : [...prev, branchId]);
  };

  const handlePlateHover = (plateNumber, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(rect.right + 12, window.innerWidth - 320);
    const y = Math.max(rect.top, 8);
    setCardPos({ x, y });
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      fetch(`${BASE_URL}/super-admin/user-by-plate/${plateNumber}`, { headers })
        .then(res => res.json())
        .then(data => { setHoveredPlate(plateNumber); setUserCard(data); })
        .catch(err => console.error(err));
    }, 400);
  };

  const handlePlateLeave = () => {
    clearTimeout(hoverTimer.current);
    setTimeout(() => { setHoveredPlate(null); setUserCard(null); }, 200);
  };

  // ✅ Insurance helpers
  const openInsuranceModal = (u) => {
    setInsuranceModal(u); setInsuranceMsg("");
    setInsuranceForm({
      insuranceStatus:  u.insuranceStatus  || "PENDING",
      insuranceCompany: u.insuranceCompany || "",
      insuranceExpiry:  u.insuranceExpiry  || "",
      insuranceNote:    u.insuranceNote    || ""
    });
  };

  const saveInsurance = () => {
    fetch(`${BASE_URL}/super-admin/users/${insuranceModal.id}/insurance`, {
      method: "PUT", headers, body: JSON.stringify(insuranceForm)
    }).then(res => res.json()).then(() => {
      setInsuranceMsg("✅ Saved!");
      setRegUsers(prev => prev.map(u => u.id === insuranceModal.id ? { ...u, ...insuranceForm } : u));
      setTimeout(() => setInsuranceModal(null), 1000);
    }).catch(() => setInsuranceMsg("❌ Failed to save"));
  };

  // ✅ Auto-fetch insurance from RapidAPI via our backend
  const fetchInsuranceFromAPI = async (userObj) => {
    if (!userObj.rcNumber) { alert("This user has no RC number on file."); return; }
    setFetchingInsurance(userObj.id);
    try {
      const res = await fetch(`${BASE_URL}/super-admin/users/${userObj.id}/fetch-insurance`, {
        method: "POST", headers
      });
      const text = await res.text();
      let data = {}; try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
      if (!res.ok || !data.success) {
        alert("Could not fetch insurance: " + (data.error || "Unknown error"));
        return;
      }
      setRegUsers(prev => prev.map(u => u.id === userObj.id ? {
        ...u,
        insuranceStatus:  data.insuranceStatus,
        insuranceCompany: data.insuranceCompany,
        insuranceExpiry:  data.insuranceExpiry
      } : u));
      if (insuranceModal && insuranceModal.id === userObj.id) {
        setInsuranceForm(prev => ({
          ...prev,
          insuranceStatus:  data.insuranceStatus  || prev.insuranceStatus,
          insuranceCompany: data.insuranceCompany || prev.insuranceCompany,
          insuranceExpiry:  data.insuranceExpiry  || prev.insuranceExpiry
        }));
      }
      alert(`✅ Fetched!\n\nCompany: ${data.insuranceCompany || "N/A"}\nValid Until: ${data.insuranceExpiry || "N/A"}\nStatus: ${data.insuranceStatus}`);
    } catch (err) {
      alert("Failed to fetch insurance: " + err.message);
    } finally {
      setFetchingInsurance(null);
    }
  };

  const insuranceBadge = (status) => {
    const map = {
      VERIFIED:    { label: "✅ Verified",    cls: "superadmin-ins--verified"    },
      PENDING:     { label: "⏳ Pending",     cls: "superadmin-ins--pending"     },
      NOT_INSURED: { label: "❌ Not Insured", cls: "superadmin-ins--notinsured"  },
      EXPIRED:     { label: "⚠️ Expired",    cls: "superadmin-ins--expired"     },
    };
    const s = map[status] || map.PENDING;
    return <span className={`superadmin-ins-badge ${s.cls}`}>{s.label}</span>;
  };

  // ✅ Filter registered users
  const filteredRegUsers = regUsers.filter(u => {
    const matchSearch = !userSearch ||
      u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.plateNumber?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.rcNumber?.toLowerCase().includes(userSearch.toLowerCase());
    const matchStatus = insuranceFilter === "ALL" || u.insuranceStatus === insuranceFilter;
    return matchSearch && matchStatus;
  });

  const formatDateTime = (dt) => {
    if (!dt) return "-";
    return new Date(dt).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true
    });
  };

  const COLS        = ["S.No", "Plate Number", "Branch", "Entry Time", "Exit Time", "Status", "Price"];
  const BRANCH_COLS = ["#", "Branch Name", "Location", "Username", "Owned Branches", "Password", "Actions"];
  const USER_COLS   = ["#", "Name", "Phone", "Plate No.", "RC Number", "Balance", "Insurance", "Actions"];

  return (
    <div className="superadmin-wrapper">

      {/* NAVBAR */}
      <nav className="superadmin-navbar">
        <div className="superadmin-nav-logo">
          <img src={ptagLogo} alt="PTag Logo" className="superadmin-nav-logo-img" />
          <div className="superadmin-nav-logo-text">
            <span className="ptag-bold">P</span><span className="ptag-thin">Tag</span>
          </div>
        </div>
        <div className="superadmin-nav-center">
          <p className="superadmin-nav-title">Super Admin Command Center</p>
          <p className="superadmin-nav-subtitle">All Branches · Vehicle Logs</p>
        </div>
        <div className="superadmin-nav-user" ref={avatarRef}>
          {user?.name && <span>{user.name}</span>}
          <div className="superadmin-nav-avatar"
            onClick={() => setAvatarMenuOpen(prev => !prev)}
            style={{ cursor: "pointer" }}>
            {user?.name?.charAt(0).toUpperCase() ?? "A"}
          </div>
          {avatarMenuOpen && (
            <div className="superadmin-avatar-menu">
              <button className="superadmin-avatar-logout" onClick={handleLogout}>🚪 Logout</button>
            </div>
          )}
        </div>
      </nav>

      {/* BODY */}
      <div className="superadmin-body">

        {/* Hero */}
        <div className="superadmin-hero">
          <div>
            <h2 className="superadmin-hero-title">Super Admin Dashboard</h2>
            <p className="superadmin-hero-sub">All Branches Vehicle Logs</p>
          </div>
          <div className="superadmin-hero-stats">
            <div className="superadmin-hero-stat">
              <span className="superadmin-hero-stat-count">{filtered.length.toLocaleString()}</span>
              <span className="superadmin-hero-stat-label">Records</span>
            </div>
            <div className="superadmin-hero-stat-divider" />
            <div className="superadmin-hero-stat">
              <span className="superadmin-hero-stat-count">₹{totalRevenue.toFixed(0)}</span>
              <span className="superadmin-hero-stat-label">Revenue</span>
            </div>
            <div className="superadmin-hero-stat-divider" />
            <div className="superadmin-hero-stat">
              <span className="superadmin-hero-stat-count">{regUsers.length}</span>
              <span className="superadmin-hero-stat-label">Users</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="superadmin-tabs">
          <button className={`superadmin-tab ${activeTab === "logs"     ? "superadmin-tab--active" : ""}`} onClick={() => setActiveTab("logs")}>📋 Vehicle Logs</button>
          <button className={`superadmin-tab ${activeTab === "branches" ? "superadmin-tab--active" : ""}`} onClick={() => setActiveTab("branches")}>🏢 Branch Users</button>
          <button className={`superadmin-tab ${activeTab === "users"    ? "superadmin-tab--active" : ""}`} onClick={() => setActiveTab("users")}>👥 Users & Insurance</button>
        </div>

        {/* ── LOGS TAB ── */}
        {activeTab === "logs" && (
          <div className="superadmin-content">
            <div className="superadmin-filter">
              <p className="superadmin-filter-heading">Filter Logs</p>
              <div className="superadmin-field">
                <label>Search Vehicle</label>
                <div className="superadmin-search-wrap">
                  <span className="superadmin-search-icon">🔍</span>
                  <input type="text" placeholder="Type plate number..." value={search}
                    onChange={handleSearch} className="superadmin-search-input" />
                  {search && <button className="superadmin-search-clear"
                    onClick={() => { setSearch(""); setFiltered(applyFilters(logs, from, to, branch, "")); }}>✕</button>}
                </div>
              </div>
              <div className="superadmin-field"><label>From</label><input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
              <div className="superadmin-field"><label>To</label><input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
              <div className="superadmin-field">
                <label>Branch</label>
                <select value={branch} onChange={e => setBranch(e.target.value)}>
                  <option value="ALL">All Branches</option>
                  {branches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <button className="superadmin-filter-btn-gold"  onClick={handleFilter}>Apply Filters</button>
              <button className="superadmin-filter-btn-dark"  onClick={handleReset}>Reset All</button>
              <button className="superadmin-filter-btn-green" onClick={downloadExcel}>⬇ Download Excel</button>
              <p className="superadmin-filter-count">Showing <strong>{filtered.length}</strong> of {logs.length} records</p>
              <div className="superadmin-revenue-panel">
                <p className="superadmin-revenue-title">💰 Revenue Summary</p>
                <div className="superadmin-revenue-total">
                  <span>Total</span>
                  <span className="superadmin-revenue-amount">₹{totalRevenue.toFixed(0)}</span>
                </div>
                {Object.entries(branchRevenue).sort((a, b) => b[1] - a[1]).map(([name, amt]) => (
                  <div key={name} className="superadmin-revenue-row">
                    <span className="superadmin-revenue-branch">{name}</span>
                    <span className="superadmin-revenue-branch-amt">₹{amt.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="superadmin-table-wrap">
              <div className="superadmin-table-scroll">
                <table className="superadmin-table">
                  <thead><tr>{COLS.map(h => <th key={h}>{h}</th>)}</tr></thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={7}><div className="superadmin-empty"><div className="superadmin-empty-icon">📋</div>{search ? `No vehicles matching "${search}"` : "No records."}</div></td></tr>
                    ) : filtered.map((log, i) => (
                      <tr key={log.id ?? i}>
                        <td className="superadmin-td-serial">{i + 1}</td>
                        <td className="superadmin-td-plate"
                          onMouseEnter={e => handlePlateHover(log.plateNumber, e)}
                          onMouseLeave={handlePlateLeave}
                          style={{ cursor: "pointer" }}>
                          {search ? highlightMatch(log.plateNumber, search) : log.plateNumber}
                        </td>
                        <td className="superadmin-td-branch">{log.branch?.branchName ?? "-"}</td>
                        <td className="superadmin-td-time">{formatDateTime(log.entryTime)}</td>
                        <td className="superadmin-td-time">{formatDateTime(log.exitTime)}</td>
                        <td><span className={`superadmin-badge ${log.inside ? "superadmin-badge-inside" : "superadmin-badge-exited"}`}>{log.inside ? "Inside" : "Exited"}</span></td>
                        <td className="superadmin-td-price">{log.price != null ? `₹${log.price.toFixed(0)}` : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── BRANCH USERS TAB ── */}
        {activeTab === "branches" && (
          <div className="superadmin-branches">
            <div className="superadmin-branch-toolbar">
              <div className="superadmin-field" style={{ flex: 1 }}>
                <label>Backend URL (for config.ini)</label>
                <input type="text" value={backendUrl} onChange={e => setBackendUrl(e.target.value)} className="superadmin-branch-url-input" />
              </div>
              <button className="superadmin-filter-btn-gold superadmin-branch-new-btn" onClick={() => setShowForm(!showForm)}>
                {showForm ? "Cancel" : "+ New Branch User"}
              </button>
            </div>

            {showForm && (
              <div className="superadmin-branch-form">
                <p className="superadmin-filter-heading">Create New Branch User</p>
                <div className="superadmin-branch-form-grid">
                  {[
                    { key: "branchName", label: "Branch Name", placeholder: "Branch A" },
                    { key: "location",   label: "Location",    placeholder: "BTM Layout" },
                    { key: "userName",   label: "Username",    placeholder: "branchadminA" },
                    { key: "password",   label: "Password",    placeholder: "••••••••", type: "password" }
                  ].map(field => (
                    <div key={field.key} className="superadmin-field">
                      <label>{field.label}</label>
                      <input type={field.type || "text"} placeholder={field.placeholder}
                        value={newUser[field.key]} onChange={e => setNewUser({ ...newUser, [field.key]: e.target.value })} />
                    </div>
                  ))}
                </div>
                <button className="superadmin-filter-btn-green superadmin-branch-create-btn" onClick={createBranchUser}>Create Branch User</button>
              </div>
            )}

            <div className="superadmin-table-wrap">
              <div className="superadmin-table-scroll">
                <table className="superadmin-table">
                  <thead><tr>{BRANCH_COLS.map(h => <th key={h}>{h}</th>)}</tr></thead>
                  <tbody>
                    {branchUsers.length === 0 ? (
                      <tr><td colSpan={7}><div className="superadmin-empty"><div className="superadmin-empty-icon">🏢</div>No branch users found.</div></td></tr>
                    ) : branchUsers.map((u, i) => {
                      const activeBranches = (u.branches || []).filter(b => allBranches.some(ab => ab.id === b.id));
                      return (
                        <tr key={u.id}>
                          <td className="superadmin-td-serial">{i + 1}</td>
                          <td className="superadmin-td-plate">{u.branchName}</td>
                          <td className="superadmin-td-branch">{u.location}</td>
                          <td style={{ fontFamily: "monospace", color: "#2a1010" }}>{u.userName}</td>
                          <td>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                              {activeBranches.length === 0
                                ? <span style={{ color: "#c09090", fontSize: "11px" }}>None</span>
                                : activeBranches.map(b => <span key={b.id} className="superadmin-branch-chip">{b.branchName}</span>)}
                            </div>
                          </td>
                          <td>
                            <div className="superadmin-pass-cell">
                              <span className="superadmin-pass-text">
                                {visiblePassFor === u.id ? (plainPasswords[u.id] || "Reset to reveal") : "••••••••"}
                              </span>
                              <button className="superadmin-pass-toggle" onClick={() => setVisiblePassFor(prev => prev === u.id ? null : u.id)}>
                                {visiblePassFor === u.id ? "Hide" : "Show"}
                              </button>
                              <button className="superadmin-btn-reset" onClick={() => resetPassword(u.id)}>Reset</button>
                            </div>
                          </td>
                          <td>
                            <div className="superadmin-actions-cell">
                              <button className="superadmin-btn-assign" onClick={() => openAssignModal(u)}>Assign</button>
                              <button className="superadmin-btn-config" onClick={() => downloadConfig(u.id)}>⬇ Config</button>
                              <div className="superadmin-actions-divider" />
                              <button className="superadmin-btn-delete" onClick={() => setDeleteModal(u)}>🗑</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ✅ ── USERS & INSURANCE TAB ── */}
        {activeTab === "users" && (
          <div className="superadmin-branches">

            {/* Toolbar */}
            <div className="superadmin-branch-toolbar" style={{ gap: "12px" }}>
              <div className="superadmin-search-wrap" style={{ flex: 1 }}>
                <span className="superadmin-search-icon">🔍</span>
                <input type="text" placeholder="Search by name, plate or RC number..."
                  value={userSearch} onChange={e => setUserSearch(e.target.value)}
                  className="superadmin-search-input" />
                {userSearch && <button className="superadmin-search-clear" onClick={() => setUserSearch("")}>✕</button>}
              </div>

              {/* Status filter pills */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {["ALL", "PENDING", "VERIFIED", "NOT_INSURED", "EXPIRED"].map(s => (
                  <button key={s}
                    onClick={() => setInsuranceFilter(s)}
                    className={`superadmin-ins-filter-btn ${insuranceFilter === s ? "superadmin-ins-filter-btn--active" : ""}`}>
                    {s === "ALL" ? "All" : s === "NOT_INSURED" ? "Not Insured" : s.charAt(0) + s.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats row */}
            <div className="superadmin-ins-stats">
              {[
                { label: "Total Users",   val: regUsers.length,                                          cls: "" },
                { label: "Verified",      val: regUsers.filter(u => u.insuranceStatus === "VERIFIED").length,    cls: "green" },
                { label: "Pending",       val: regUsers.filter(u => u.insuranceStatus === "PENDING" || !u.insuranceStatus).length, cls: "amber" },
                { label: "Not Insured",   val: regUsers.filter(u => u.insuranceStatus === "NOT_INSURED").length, cls: "red" },
                { label: "Expired",       val: regUsers.filter(u => u.insuranceStatus === "EXPIRED").length,     cls: "orange" },
              ].map(stat => (
                <div key={stat.label} className={`superadmin-ins-stat superadmin-ins-stat--${stat.cls}`}>
                  <span className="superadmin-ins-stat-val">{stat.val}</span>
                  <span className="superadmin-ins-stat-label">{stat.label}</span>
                </div>
              ))}
            </div>

            {/* Users table */}
            <div className="superadmin-table-wrap">
              <div className="superadmin-table-scroll">
                <table className="superadmin-table">
                  <thead><tr>{USER_COLS.map(h => <th key={h}>{h}</th>)}</tr></thead>
                  <tbody>
                    {usersLoading ? (
                      <tr><td colSpan={8}><div className="superadmin-empty">Loading users...</div></td></tr>
                    ) : filteredRegUsers.length === 0 ? (
                      <tr><td colSpan={8}><div className="superadmin-empty"><div className="superadmin-empty-icon">👤</div>No users found.</div></td></tr>
                    ) : filteredRegUsers.map((u, i) => (
                      <tr key={u.id}>
                        <td className="superadmin-td-serial">{i + 1}</td>
                        <td style={{ fontWeight: "600", color: "#2a1010" }}>{u.name}</td>
                        <td style={{ fontSize: "12px", color: "#8a5050" }}>{u.phoneNumber}</td>
                        <td className="superadmin-td-plate">{u.plateNumber}</td>
                        <td style={{ fontFamily: "monospace", fontSize: "12px", color: "#6a3a3a" }}>{u.rcNumber || "—"}</td>
                        <td style={{ fontWeight: "600", color: "#5C1F1F" }}>₹{u.balance?.toFixed(0)}</td>
                        <td>{insuranceBadge(u.insuranceStatus || "PENDING")}</td>
                        <td>
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                            {u.rcNumber && (
                              <>
                                <button className="superadmin-btn-parivahan"
                                  disabled={fetchingInsurance === u.id}
                                  onClick={() => fetchInsuranceFromAPI(u)}>
                                  {fetchingInsurance === u.id ? "⏳..." : "🔄 Auto-Verify"}
                                </button>
                                <button className="superadmin-btn-parivahan"
                                  onClick={() => window.open(
                                    `https://parivahan.gov.in/rcdlstatus/?pur_cd=101&regn_no=${encodeURIComponent(u.rcNumber)}`,
                                    "_blank"
                                  )}>
                                  🔍 Manual
                                </button>
                              </>
                            )}
                            <button className="superadmin-btn-assign"
                              onClick={() => openInsuranceModal(u)}>
                              📝 Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ✅ INSURANCE UPDATE MODAL */}
      {insuranceModal && (
        <div className="superadmin-modal-overlay" onClick={() => setInsuranceModal(null)}>
          <div className="superadmin-modal superadmin-ins-modal" onClick={e => e.stopPropagation()}>
            <h3 className="superadmin-modal-title">Update Insurance Status</h3>
            <p className="superadmin-modal-sub">
              <strong>{insuranceModal.name}</strong> · {insuranceModal.plateNumber}
              {insuranceModal.rcNumber && <span> · RC: <code>{insuranceModal.rcNumber}</code></span>}
            </p>

            {/* Auto-fetch + manual check */}
            {insuranceModal.rcNumber && (
              <div style={{ display: "flex", gap: "8px", marginBottom: "18px" }}>
                <button
                  className="superadmin-ins-parivahan-link"
                  style={{ border: "none", cursor: "pointer", flex: 1 }}
                  disabled={fetchingInsurance === insuranceModal.id}
                  onClick={() => fetchInsuranceFromAPI(insuranceModal)}>
                  {fetchingInsurance === insuranceModal.id ? "⏳ Fetching..." : "🔄 Auto-Fetch Insurance"}
                </button>
                <a
                  href={`https://parivahan.gov.in/rcdlstatus/?pur_cd=101&regn_no=${encodeURIComponent(insuranceModal.rcNumber)}`}
                  target="_blank" rel="noreferrer"
                  className="superadmin-ins-parivahan-link"
                  style={{ flex: 1, textAlign: "center" }}>
                  🔍 Manual Check
                </a>
              </div>
            )}

            {/* Status buttons */}
            <div className="superadmin-ins-status-row">
              {[
                { val: "VERIFIED",    label: "✅ Verified",    cls: "green" },
                { val: "PENDING",     label: "⏳ Pending",     cls: "amber" },
                { val: "NOT_INSURED", label: "❌ Not Insured", cls: "red"   },
                { val: "EXPIRED",     label: "⚠️ Expired",    cls: "orange" },
              ].map(s => (
                <button key={s.val}
                  className={`superadmin-ins-status-btn superadmin-ins-status-btn--${s.cls}
                    ${insuranceForm.insuranceStatus === s.val ? "superadmin-ins-status-btn--selected" : ""}`}
                  onClick={() => setInsuranceForm(prev => ({ ...prev, insuranceStatus: s.val }))}>
                  {s.label}
                </button>
              ))}
            </div>

            {/* Details */}
            <div className="superadmin-ins-fields">
              <div className="superadmin-field">
                <label>Insurance Company</label>
                <input type="text" placeholder="e.g. HDFC ERGO, Bajaj Allianz..."
                  value={insuranceForm.insuranceCompany}
                  onChange={e => setInsuranceForm(prev => ({ ...prev, insuranceCompany: e.target.value }))} />
              </div>
              <div className="superadmin-field">
                <label>Policy Expiry Date</label>
                <input type="date"
                  value={insuranceForm.insuranceExpiry}
                  onChange={e => setInsuranceForm(prev => ({ ...prev, insuranceExpiry: e.target.value }))} />
              </div>
              <div className="superadmin-field">
                <label>Note (optional)</label>
                <input type="text" placeholder="Any additional notes..."
                  value={insuranceForm.insuranceNote}
                  onChange={e => setInsuranceForm(prev => ({ ...prev, insuranceNote: e.target.value }))} />
              </div>
            </div>

            {insuranceMsg && (
              <p style={{ color: insuranceMsg.includes("✅") ? "#27ae60" : "#c0392b",
                          fontSize: "13px", fontWeight: "600", margin: "0 0 12px" }}>
                {insuranceMsg}
              </p>
            )}

            <div className="superadmin-modal-actions">
              <button className="superadmin-filter-btn-dark"
                onClick={() => setInsuranceModal(null)}
                style={{ width: "auto", padding: "10px 24px" }}>Cancel</button>
              <button className="superadmin-filter-btn-gold"
                onClick={saveInsurance}
                style={{ width: "auto", padding: "10px 24px" }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* PLATE HOVER CARD */}
      {hoveredPlate && userCard && (
        <div className="superadmin-user-card" style={{ top: cardPos.y, left: cardPos.x }}>
          {userCard.found ? (
            <>
              <div className="superadmin-user-card-header">
                <span className="superadmin-user-card-avatar">{userCard.name?.charAt(0).toUpperCase()}</span>
                <div>
                  <p className="superadmin-user-card-name">{userCard.name}</p>
                  <p className="superadmin-user-card-plate">{userCard.plateNumber}</p>
                </div>
              </div>
              <div className="superadmin-user-card-body">
                <div className="superadmin-user-card-row"><span>📧</span><span>{userCard.email}</span></div>
                <div className="superadmin-user-card-row"><span>📱</span><span>{userCard.phoneNumber}</span></div>
                <div className="superadmin-user-card-row"><span>💰</span><span>Balance: ₹{userCard.balance?.toFixed(2)}</span></div>
                {userCard.rcNumber && (
                  <div className="superadmin-user-card-row"><span>📄</span><span>RC: {userCard.rcNumber}</span></div>
                )}
                {userCard.insuranceStatus && (
                  <div className="superadmin-user-card-row">
                    <span>🛡</span>
                    {insuranceBadge(userCard.insuranceStatus)}
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="superadmin-user-card-unregistered">Unregistered Vehicle</p>
          )}
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteModal && (
        <div className="superadmin-modal-overlay" onClick={() => setDeleteModal(null)}>
          <div className="superadmin-delete-modal" onClick={e => e.stopPropagation()}>
            <div className="superadmin-delete-modal-icon">🗑️</div>
            <h3 className="superadmin-delete-modal-title">Delete Branch User?</h3>
            <p className="superadmin-delete-modal-sub">
              Are you sure you want to delete <strong>{deleteModal.branchName}</strong>?<br />
              <span style={{ color: "#c0392b" }}>This action cannot be undone.</span>
            </p>
            <div className="superadmin-delete-modal-actions">
              <button className="superadmin-delete-modal-cancel" onClick={() => setDeleteModal(null)}>Cancel</button>
              <button className="superadmin-delete-modal-confirm" onClick={() => deleteBranchUser(deleteModal.id)}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN MODAL */}
      {assignModal && (
        <div className="superadmin-modal-overlay" onClick={() => setAssignModal(null)}>
          <div className="superadmin-modal" onClick={e => e.stopPropagation()}>
            <h3 className="superadmin-modal-title">Assign Branches</h3>
            <p className="superadmin-modal-sub">Select branches <strong>{assignModal.userName}</strong> can manage</p>
            <div className="superadmin-modal-branches">
              {allBranches.map(b => (
                <label key={b.id} className="superadmin-modal-branch-item">
                  <input type="checkbox" checked={selectedBranchIds.includes(b.id)}
                    onChange={() => toggleBranchSelection(b.id)} />
                  <div>
                    <p className="superadmin-modal-branch-name">{b.branchName}</p>
                    <p className="superadmin-modal-branch-loc">{b.location}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="superadmin-modal-actions">
              <button className="superadmin-filter-btn-dark" onClick={() => setAssignModal(null)} style={{ width: "auto", padding: "10px 24px" }}>Cancel</button>
              <button className="superadmin-filter-btn-gold" onClick={saveAssignment} style={{ width: "auto", padding: "10px 24px" }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const highlightMatch = (text, query) => {
  if (!query || !text) return text;
  const idx = text.toUpperCase().indexOf(query.toUpperCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="superadmin-highlight">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
};

export default SuperAdminDashboard;

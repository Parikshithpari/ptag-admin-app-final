import React, { useEffect, useMemo, useState } from 'react';
import { Client } from '@stomp/stompjs';
import axios from 'axios';
import './dashboard.css';
import usePageTitle from '../usePageTitle';
import ptagLogo from '../assets/PTag.png';

// ✅ Pointed at your hosted backend instead of localhost
const BASE_URL = "https://anpr-gconnectt.com";
const WS_URL   = "wss://anpr-gconnectt.com/ws/websocket";

function Dashboard({ logs }) {
  usePageTitle("Admin Dashboard");
  const [data,             setData]           = useState(logs || []);
  const [alertMessage,     setAlertMessage]   = useState("");
  const [newIds,           setNewIds]         = useState(new Set());
  const [pricePerMinute,   setPricePerMinute] = useState(null);
  const [newPrice,         setNewPrice]       = useState("");
  const [priceMsg,         setPriceMsg]       = useState("");
  const [myBranches,       setMyBranches]     = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(null);

  const token = localStorage.getItem("token");

  // ✅ Memoized so it has a stable identity across renders and can be
  // safely listed as a useEffect dependency without causing extra runs
  const authHeaders = useMemo(() => ({
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true"
  }), [token]);

  const formatDateTime = (dt) => {
    if (!dt) return "-";
    return new Date(dt).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true
    });
  };

  const getDate = (dt) => formatDateTime(dt).split(",")[0] ?? "-";
  const getTime = (dt) => formatDateTime(dt).split(",")[1]?.trim() ?? "-";

  // ✅ Fetch assigned branches on load
  useEffect(() => {
    axios.get(`${BASE_URL}/api/branch/my-branches`, { headers: authHeaders })
      .then(res => {
        setMyBranches(res.data);
        if (res.data.length > 0) {
          setSelectedBranchId(res.data[0].id);
        }
      })
      .catch(err => console.error("Error fetching branches:", err));
  }, [authHeaders]);

  // ✅ Fetch logs and price when selected branch changes
  useEffect(() => {
    if (!selectedBranchId) return;

    axios.get(`${BASE_URL}/getLogs?branchId=${selectedBranchId}`,
      { headers: authHeaders })
      .then(res => setData(res.data))
      .catch(err => console.error("Error fetching logs:", err));

    axios.get(`${BASE_URL}/api/branch/price/${selectedBranchId}`,
      { headers: authHeaders })
      .then(res => setPricePerMinute(res.data.pricePerMinute))
      .catch(err => console.error("Error fetching price:", err));

  }, [selectedBranchId, authHeaders]);

  // ✅ WebSocket setup once
  useEffect(() => {
    const stompClient = new Client({
      brokerURL: WS_URL,
      reconnectDelay: 5000,
      connectHeaders: authHeaders,
      onStompError:     (frame) => console.error("STOMP error:", frame.headers['message']),
      onWebSocketError: (error) => console.error("WebSocket error:", error),
      onDisconnect:     ()      => console.warn("STOMP disconnected"),
      debug:            (str)   => console.log("[STOMP]", str)
    });

    stompClient.onConnect = () => {
      stompClient.subscribe("/topic/plates", (message) => {
        const log = JSON.parse(message.body);
        const id  = log.id ?? `ws-${Date.now()}`;

        setAlertMessage(`New plate detected: ${log.plateNumber}`);
        setTimeout(() => setAlertMessage(""), 5000);

        setData(prev => [{ ...log, _wsId: id }, ...prev]);

        setNewIds(prev => new Set([...prev, id]));
        setTimeout(() => setNewIds(prev => {
          const next = new Set(prev); next.delete(id); return next;
        }), 2000);
      });
    };

    stompClient.activate();
    return () => stompClient.deactivate();
  }, [authHeaders]);

  // ✅ Update price for selected branch
  const updatePrice = () => {
    if (!newPrice || isNaN(newPrice)) {
      setPriceMsg("Please enter a valid price.");
      setTimeout(() => setPriceMsg(""), 3000);
      return;
    }
    axios.put(`${BASE_URL}/api/branch/price/${selectedBranchId}`,
      { pricePerMinute: parseFloat(newPrice) },
      { headers: authHeaders }
    ).then(res => {
      setPricePerMinute(res.data.pricePerMinute);
      setNewPrice("");
      setPriceMsg("Price updated successfully!");
      setTimeout(() => setPriceMsg(""), 3000);
    }).catch(err => {
      console.error(err);
      setPriceMsg("Failed to update price.");
      setTimeout(() => setPriceMsg(""), 3000);
    });
  };

  // ✅ Get selected branch name
  const selectedBranch = myBranches.find(b => b.id === selectedBranchId);

  return (
    <div className="admindash-wrapper">

      {/* ── NAVBAR ── */}
      <nav className="adminlog-navbar">
        <div className="admindash-nav-logo">
          <img src={ptagLogo} alt="PTag Logo" className="admindash-nav-logo-img" />
          <div className="admindash-nav-logo-text">
            <span className="ptag-bold">P</span>
            <span className="ptag-thin">Tag</span>
          </div>
        </div>
        <span className="admindash-nav-title">Admin Command Center</span>

        {myBranches.length > 1 && (
          <select
            value={selectedBranchId ?? ""}
            onChange={e => setSelectedBranchId(Number(e.target.value))}
            className="admindash-branch-select"
          >
            {myBranches.map(b => (
              <option key={b.id} value={b.id}>
                {b.branchName}
              </option>
            ))}
          </select>
        )}

        {myBranches.length === 1 && (
          <div className="admindash-branch-tag">
            {myBranches[0].branchName}
          </div>
        )}
      </nav>

      {/* ── MAIN BODY ── */}
      <main className="admindash-body">

        {alertMessage && (
          <div className="admindash-alert">
            <span className="admindash-alert-dot" />
            {alertMessage}
          </div>
        )}

        <div className="admindash-price-card">
          <div className="admindash-price-left">
            <p className="admindash-price-label">
              Current Parking Rate
              {selectedBranch && (
                <span style={{ marginLeft: "8px", color: "#8B3A3A" }}>
                  — {selectedBranch.branchName}
                </span>
              )}
            </p>
            <p className="admindash-price-value">
              ₹{pricePerMinute ?? "—"}
              <span className="admindash-price-unit"> / min</span>
            </p>
          </div>

          <div className="admindash-price-right">
            <input
              type="number"
              inputMode="decimal"
              placeholder="New price per minute"
              value={newPrice}
              onChange={e => setNewPrice(e.target.value)}
              className="admindash-price-input"
            />
            <button onClick={updatePrice} className="admindash-price-btn">
              Update Price
            </button>
            {priceMsg && (
              <span className="admindash-price-msg"
                style={{ color: priceMsg.includes("success") ? "#27ae60" : "#e74c3c" }}>
                {priceMsg}
              </span>
            )}
          </div>
        </div>

        <div className="admindash-card">
          <h2 className="admindash-title">
            Vehicle Entry Logs
            {selectedBranch && (
              <span style={{ fontSize: "14px", fontWeight: "500",
                             color: "#9a6060", marginLeft: "12px" }}>
                {selectedBranch.branchName} — {selectedBranch.location}
              </span>
            )}
          </h2>

          <div className="admindash-table-scroll">
            <table className="admindash-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Date</th>
                  <th>Vehicle Number</th>
                  <th>In Time</th>
                  <th>Exit Time</th>
                  <th>Status</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="admindash-empty">
                      No logs found.
                    </td>
                  </tr>
                ) : (
                  data.map((log, index) => {
                    const rowId = log._wsId ?? log.id ?? index;
                    const isNew = newIds.has(rowId);
                    return (
                      <tr key={rowId}
                          className={`admindash-row${isNew ? " admindash-row-new" : ""}`}>
                        <td style={{ color: "#b09090", fontSize: 12 }}>{index + 1}</td>
                        <td>{getDate(log.entryTime)}</td>
                        <td className="admindash-plate">{log.plateNumber}</td>
                        <td>{getTime(log.entryTime)}</td>
                        <td>{log.exitTime ? getTime(log.exitTime) : "—"}</td>
                        <td>
                          <span className={`admindash-badge ${log.inside
                            ? "admindash-badge--in"
                            : "admindash-badge--out"}`}>
                            {log.inside ? "Inside" : "Exited"}
                          </span>
                        </td>
                        <td className="admindash-price">
                          {log.price != null ? `₹${log.price}` : "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}

export default Dashboard;

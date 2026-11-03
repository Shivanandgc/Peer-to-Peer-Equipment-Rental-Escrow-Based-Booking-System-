"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const initialData = {
  equipment: [],
  bookings: [],
  payments: [],
};

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f3f6fc",
    color: "#14243e",
    fontFamily: "Arial, Helvetica, sans-serif",
  },
  header: {
    background: "#142743",
    color: "#fff",
    padding: "24px 5%",
  },
  headerInner: { maxWidth: "1450px", margin: "0 auto" },
  headerTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "16px",
  },
  brand: { fontSize: "25px", fontWeight: 800, margin: 0 },
  subtitle: { fontSize: "14px", marginTop: "5px", color: "#d7e2f3" },
  nav: { display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "22px" },
  navButton: {
    padding: "12px 20px",
    borderRadius: "10px",
    border: "1px solid #405674",
    background: "#203956",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
  },
  main: { maxWidth: "1450px", margin: "0 auto", padding: "30px 5%" },
  heading: { fontSize: "32px", margin: "6px 0" },
  muted: { color: "#61758f", lineHeight: 1.6 },
  status: {
    display: "inline-block",
    padding: "12px 18px",
    borderRadius: "24px",
    background: "#d7f8ed",
    color: "#087c6c",
    fontSize: "14px",
  },
  sectionHeading: { fontSize: "23px", margin: "0 0 16px" },
  panel: {
    background: "#fff",
    border: "1px solid #dce5f3",
    borderRadius: "18px",
    padding: "24px",
    marginTop: "24px",
    overflowX: "auto",
  },
  metrics: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "16px",
    marginTop: "24px",
  },
  metric: {
    background: "#fff",
    border: "1px solid #dce5f3",
    borderRadius: "16px",
    padding: "24px",
  },
  metricValue: { fontSize: "30px", fontWeight: 800, margin: "12px 0" },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px",
    border: "1px solid #d4dfef",
    borderRadius: "9px",
    fontSize: "14px",
    background: "#fff",
    color: "#14243e",
  },
  button: {
    padding: "11px 16px",
    borderRadius: "9px",
    border: "1px solid #d4dfef",
    background: "#fff",
    color: "#14243e",
    cursor: "pointer",
    fontWeight: 700,
  },
  primaryButton: {
    padding: "11px 16px",
    borderRadius: "9px",
    border: "1px solid #54d8bd",
    background: "#54d8bd",
    color: "#10243c",
    cursor: "pointer",
    fontWeight: 700,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "18px",
    textAlign: "left",
    minWidth: "650px",
  },
  th: {
    padding: "14px 12px",
    background: "#f0f4fa",
    borderBottom: "1px solid #dce5f3",
    fontSize: "14px",
  },
  td: {
    padding: "14px 12px",
    borderBottom: "1px solid #e5ebf4",
    fontSize: "14px",
  },
  badge: {
    display: "inline-block",
    padding: "6px 11px",
    background: "#d7f8ed",
    color: "#087c6c",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 700,
  },
  footer: {
    textAlign: "center",
    padding: "20px",
    color: "#61758f",
    fontSize: "14px",
  },
  error: {
    color: "#b42318",
    background: "#fff0ee",
    padding: "12px",
    borderRadius: "8px",
    marginTop: "12px",
  },
  success: {
    color: "#087c6c",
    background: "#e7f8f1",
    padding: "12px",
    borderRadius: "8px",
    marginTop: "12px",
  },
  formBox: {
    padding: "18px",
    margin: "18px 0",
    background: "#f7f9fd",
    border: "1px solid #dce5f3",
    borderRadius: "12px",
  },
};

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function displayDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-IN");
}

function Table({ columns, rows, emptyMessage }) {
  return (
    <table style={styles.table}>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.label} style={styles.th}>
              {column.label}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td
              colSpan={columns.length}
              style={{ ...styles.td, textAlign: "center" }}
            >
              {emptyMessage}
            </td>
          </tr>
        ) : (
          rows.map((row, index) => (
            <tr key={row.id ?? index}>
              {columns.map((column) => (
                <td key={column.label} style={styles.td}>
                  {column.render
                    ? column.render(row)
                    : row[column.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [user, setUser] = useState(null);
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [equipmentStatus, setEquipmentStatus] = useState("all");

  // MongoDB notifications
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const [bookingEquipmentId, setBookingEquipmentId] = useState("");
  const [bookingStartDate, setBookingStartDate] = useState("");
  const [bookingEndDate, setBookingEndDate] = useState("");
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingMessage, setBookingMessage] = useState("");

  const [updatingBookingId, setUpdatingBookingId] = useState(null);
  const [bookingActionMessage, setBookingActionMessage] = useState("");
  const [bookingActionMessageType, setBookingActionMessageType] =
    useState("success");

  const [paymentBookingId, setPaymentBookingId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentMessageType, setPaymentMessageType] = useState("success");
  const [releasingPaymentId, setReleasingPaymentId] = useState(null);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    setError("");

    try {
      const sessionResponse = await fetch("/api/auth/me", {
        credentials: "include",
        cache: "no-store",
      });

      const sessionData = await sessionResponse.json();

      if (!sessionResponse.ok || !sessionData.success) {
        setUser(null);
        setError(
          sessionData.message ||
            "Your session has expired. Please log in again."
        );
        return;
      }

      setUser(sessionData.user);

      const endpoints = [
        { key: "equipment", url: "/api/equipment" },
        { key: "bookings", url: "/api/bookings" },
        { key: "payments", url: "/api/payments" },
      ];

      const results = await Promise.all(
        endpoints.map(async (endpoint) => {
          try {
            const response = await fetch(endpoint.url, {
              credentials: "include",
              cache: "no-store",
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
              console.error(endpoint.url, result.message);
              return [endpoint.key, []];
            }

            const records =
              result[endpoint.key] ||
              result.data ||
              result.items ||
              [];

            return [
              endpoint.key,
              Array.isArray(records) ? records : [],
            ];
          } catch (fetchError) {
            console.error(endpoint.url, fetchError);
            return [endpoint.key, []];
          }
        })
      );

      const updatedData = { ...initialData };

      for (const [key, records] of results) {
        updatedData[key] = records;
      }

      setData(updatedData);
    } catch (loadError) {
      console.error("Page loading error:", loadError);
      setError("Unable to load application data. Check your server.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    setNotificationsError("");

    try {
      const response = await fetch("/api/notifications", {
        credentials: "include",
        cache: "no-store",
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not load notifications.");
      }

      setNotifications(
        Array.isArray(result.notifications) ? result.notifications : []
      );
    } catch (notificationError) {
      console.error("Notifications loading error:", notificationError);
      setNotificationsError(notificationError.message);
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();

    // Check periodically so newly-created notifications appear without
    // requiring the user to refresh the whole page.
    const notificationInterval = window.setInterval(loadNotifications, 30000);
    return () => window.clearInterval(notificationInterval);
  }, [loadNotifications]);

  async function handleMarkNotificationRead(notificationId) {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notificationId }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not update notification.");
      }

      setNotifications((current) =>
        current.map((item) =>
          String(item._id) === String(notificationId)
            ? { ...item, isRead: true }
            : item
        )
      );
    } catch (notificationError) {
      console.error("Mark notification read error:", notificationError);
      setNotificationsError(notificationError.message);
    }
  }

  async function handleMarkAllNotificationsRead() {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ markAllRead: true }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not update notifications.");
      }

      setNotifications((current) =>
        current.map((item) => ({ ...item, isRead: true }))
      );
    } catch (notificationError) {
      console.error("Mark all notifications read error:", notificationError);
      setNotificationsError(notificationError.message);
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (logoutError) {
      console.error("Logout error:", logoutError);
    }

    window.location.href = "/login";
  }

  async function handleCreateBooking(event) {
    event.preventDefault();
    setBookingMessage("");

    if (!bookingEquipmentId || !bookingStartDate || !bookingEndDate) {
      setBookingMessage("Please select equipment and both rental dates.");
      return;
    }

    if (bookingEndDate < bookingStartDate) {
      setBookingMessage("End date cannot be before start date.");
      return;
    }

    setBookingSubmitting(true);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          equipment_id: Number(bookingEquipmentId),
          start_date: bookingStartDate,
          end_date: bookingEndDate,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setBookingMessage(result.message || "Could not create booking.");
        return;
      }

      setBookingMessage(
        `Booking #${result.booking.booking_id} created successfully. Status: pending.`
      );

      setBookingEquipmentId("");
      setBookingStartDate("");
      setBookingEndDate("");

      await loadData();
    } catch (bookingError) {
      console.error("Booking creation error:", bookingError);
      setBookingMessage("Unable to connect to the server. Please try again.");
    } finally {
      setBookingSubmitting(false);
    }
  }

  async function handleBookingAction(bookingId, action) {
    const actionLabel = action === "confirm" ? "confirm" : "reject";

    const accepted = window.confirm(
      `Are you sure you want to ${actionLabel} booking #${bookingId}?`
    );

    if (!accepted) return;

    setUpdatingBookingId(bookingId);
    setBookingActionMessage("");
    setBookingActionMessageType("success");

    try {
      const response = await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          booking_id: Number(bookingId),
          action,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setBookingActionMessage(
          result.message || "Could not update booking."
        );
        setBookingActionMessageType("error");
        return;
      }

      setBookingActionMessage(
        result.message || `Booking ${actionLabel}ed.`
      );
      setBookingActionMessageType("success");

      await loadData();
    } catch (actionError) {
      console.error("Booking action failed:", actionError);
      setBookingActionMessage("Unable to connect to the server.");
      setBookingActionMessageType("error");
    } finally {
      setUpdatingBookingId(null);
    }
  }

  const selectedEquipment = data.equipment.find(
    (item) => String(item.equipment_id) === String(bookingEquipmentId)
  );

  const rentalDays =
    bookingStartDate &&
    bookingEndDate &&
    bookingEndDate >= bookingStartDate
      ? Math.floor(
          (Date.parse(`${bookingEndDate}T00:00:00Z`) -
            Date.parse(`${bookingStartDate}T00:00:00Z`)) /
            86400000
        ) + 1
      : 0;

  const estimatedBookingTotal =
    rentalDays * Number(selectedEquipment?.price_per_day || 0);

  const paidBookingIds = new Set(
    data.payments.map((payment) => String(payment.booking_id))
  );

  const unpaidBookings = data.bookings.filter(
    (booking) =>
      !paidBookingIds.has(String(booking.booking_id)) &&
      !["cancelled", "returned"].includes(
        String(booking.status || "").toLowerCase()
      )
  );

  const selectedPaymentBooking = unpaidBookings.find(
    (booking) => String(booking.booking_id) === String(paymentBookingId)
  );

  const filteredEquipment = useMemo(() => {
    return data.equipment.filter((item) => {
      const term = search.toLowerCase();

      const matchesSearch = [
        item.title,
        item.category_name,
        item.owner_name,
        item.availability_status,
      ].some((value) =>
        String(value ?? "").toLowerCase().includes(term)
      );

      const matchesStatus =
        equipmentStatus === "all" ||
        String(item.availability_status ?? "").toLowerCase() ===
          equipmentStatus.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [data.equipment, search, equipmentStatus]);

  const activeBookings = data.bookings.filter((booking) =>
    ["pending", "confirmed", "ongoing"].includes(
      String(booking.status ?? "").toLowerCase()
    )
  );

  const heldPayments = data.payments.filter(
    (payment) =>
      String(payment.escrow_status).toLowerCase() === "held"
  );

  const heldAmount = heldPayments.reduce(
    (total, payment) => total + Number(payment.amount || 0),
    0
  );

  const paymentSearchResults = data.payments.filter((payment) => {
    const term = search.toLowerCase();

    return [
      payment.payment_id,
      payment.booking_id,
      payment.payment_method,
      payment.escrow_status,
    ].some((value) =>
      String(value ?? "").toLowerCase().includes(term)
    );
  });

  const bookingSearchResults = data.bookings.filter((booking) => {
    const term = search.toLowerCase();

    return [
      booking.booking_id,
      booking.equipment_id,
      booking.equipment_title,
      booking.renter_id,
      booking.status,
    ].some((value) =>
      String(value ?? "").toLowerCase().includes(term)
    );
  });

  async function handleCreatePayment(event) {
    event.preventDefault();

    setPaymentMessage("");
    setPaymentMessageType("success");

    if (!paymentBookingId) {
      setPaymentMessage("Please select a booking.");
      setPaymentMessageType("error");
      return;
    }

    setPaymentSubmitting(true);

    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          booking_id: Number(paymentBookingId),
          payment_method: paymentMethod,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setPaymentMessage(result.message || "Could not create payment.");
        setPaymentMessageType("error");
        return;
      }

      setPaymentMessage(
        `Payment #${result.payment.payment_id} created successfully. Escrow status: held.`
      );

      setPaymentMessageType("success");
      setPaymentBookingId("");
      setPaymentMethod("upi");

      await loadData();
    } catch (paymentError) {
      console.error("Payment creation error:", paymentError);
      setPaymentMessage("Unable to connect to the server.");
      setPaymentMessageType("error");
    } finally {
      setPaymentSubmitting(false);
    }
  }

  async function handleReleaseEscrow(paymentId) {
    const confirmed = window.confirm(
      "Confirm that the equipment has been returned and release this escrow?"
    );

    if (!confirmed) return;

    setReleasingPaymentId(paymentId);
    setPaymentMessage("");

    try {
      const response = await fetch("/api/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ payment_id: paymentId }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setPaymentMessage(result.message || "Could not release escrow.");
        setPaymentMessageType("error");
        return;
      }

      setPaymentMessage(result.message);
      setPaymentMessageType("success");

      await loadData();
    } catch (releaseError) {
      console.error("Escrow release error:", releaseError);
      setPaymentMessage("Unable to connect to the server.");
      setPaymentMessageType("error");
    } finally {
      setReleasingPaymentId(null);
    }
  }

  const currentTabTitle = {
    Dashboard: "Dashboard",
    Equipment: "Equipment",
    Bookings: "Bookings",
    Payments: "Payments",
    Users: "Users",
  }[activeTab];

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.headerTop}>
            <div>
              <h1 style={styles.brand}>
                Rent<span style={{ color: "#54d8bd" }}>Mate</span>
              </h1>
              <div style={styles.subtitle}>
                Peer-to-Peer Equipment Rental
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => {
                    setNotificationsOpen((open) => !open);
                    if (!notificationsOpen) loadNotifications();
                  }}
                  aria-label={`Notifications (${notifications.filter((item) => !item.isRead).length} unread)`}
                  aria-expanded={notificationsOpen}
                  style={{
                    ...styles.navButton,
                    position: "relative",
                    minWidth: "48px",
                    padding: "11px 14px",
                    fontSize: "18px",
                  }}
                >
                  🔔
                  {notifications.filter((item) => !item.isRead).length > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: "-8px",
                        right: "-8px",
                        minWidth: "19px",
                        height: "19px",
                        padding: "0 4px",
                        borderRadius: "20px",
                        background: "#e5484d",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: 800,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "2px solid #142743",
                      }}
                    >
                      {notifications.filter((item) => !item.isRead).length}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 12px)",
                      right: 0,
                      width: "min(360px, calc(100vw - 32px))",
                      maxHeight: "420px",
                      overflowY: "auto",
                      background: "#fff",
                      color: "#14243e",
                      border: "1px solid #dce5f3",
                      borderRadius: "12px",
                      boxShadow: "0 12px 32px rgba(0,0,0,0.22)",
                      zIndex: 1000,
                    }}
                  >
                    <div
                      style={{
                        padding: "14px 16px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "10px",
                        borderBottom: "1px solid #e5ebf4",
                      }}
                    >
                      <strong>Notifications</strong>
                      <button
                        type="button"
                        onClick={handleMarkAllNotificationsRead}
                        disabled={!notifications.some((item) => !item.isRead)}
                        style={{
                          ...styles.button,
                          padding: "6px 9px",
                          fontSize: "11px",
                          opacity: notifications.some((item) => !item.isRead) ? 1 : 0.5,
                        }}
                      >
                        Mark all read
                      </button>
                    </div>

                    {notificationsError && (
                      <div style={{ ...styles.error, margin: "10px", fontSize: "12px" }}>
                        {notificationsError}
                      </div>
                    )}

                    {notificationsLoading && notifications.length === 0 ? (
                      <p style={{ ...styles.muted, padding: "14px 16px", margin: 0 }}>
                        Loading notifications...
                      </p>
                    ) : notifications.length === 0 ? (
                      <p style={{ ...styles.muted, padding: "14px 16px", margin: 0 }}>
                        You have no notifications yet.
                      </p>
                    ) : (
                      notifications.map((notification) => (
                        <button
                          key={notification._id}
                          type="button"
                          onClick={() => {
                            if (!notification.isRead) {
                              handleMarkNotificationRead(notification._id);
                            }
                          }}
                          style={{
                            display: "block",
                            width: "100%",
                            padding: "13px 16px",
                            textAlign: "left",
                            border: "none",
                            borderBottom: "1px solid #edf1f7",
                            background: notification.isRead ? "#fff" : "#eef7ff",
                            color: "#14243e",
                            cursor: notification.isRead ? "default" : "pointer",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                            {!notification.isRead && (
                              <span
                                style={{
                                  width: "7px",
                                  height: "7px",
                                  borderRadius: "50%",
                                  background: "#1685d1",
                                  flexShrink: 0,
                                }}
                              />
                            )}
                            <strong style={{ fontSize: "13px" }}>
                              {notification.title || "Notification"}
                            </strong>
                          </div>
                          <div style={{ fontSize: "12px", lineHeight: 1.5, marginTop: "5px", color: "#52647c" }}>
                            {notification.message}
                          </div>
                          <div style={{ fontSize: "10px", marginTop: "7px", color: "#8492a6" }}>
                            {notification.createdAt
                              ? new Date(notification.createdAt).toLocaleString("en-IN")
                              : ""}
                            {!notification.isRead ? " · Click to mark as read" : " · Read"}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <span style={{ fontSize: "13px" }}>
                {user?.name || user?.email || "Loading account..."}
                {user?.role ? ` · ${user.role}` : ""}
              </span>

              <button onClick={handleLogout} style={styles.navButton}>
                Log out
              </button>
            </div>
          </div>

          <nav style={styles.nav}>
            {["Dashboard", "Equipment", "Bookings", "Payments", "Users"].map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setSearch("");
                    if (tab === "Payments") setPaymentMessage("");
                    if (tab === "Bookings") setBookingActionMessage("");
                  }}
                  style={{
                    ...styles.navButton,
                    background:
                      activeTab === tab ? "#54d8bd" : "#203956",
                    color: activeTab === tab ? "#10243c" : "#fff",
                    borderColor:
                      activeTab === tab ? "#54d8bd" : "#405674",
                  }}
                >
                  {tab}
                </button>
              )
            )}
          </nav>
        </div>
      </header>

      <main style={styles.main}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div>
            <div style={styles.muted}>PEER-TO-PEER RENTAL PLATFORM</div>
            <h2 style={styles.heading}>{currentTabTitle}</h2>
            <div style={styles.muted}>
              Manage equipment, bookings, payments, and escrow transactions.
            </div>
          </div>

          <span style={styles.status}>
            ● {user ? "Connected to MySQL" : "Checking session..."}
          </span>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {loading ? (
          <section style={styles.panel}>
            Loading your account and application data...
          </section>
        ) : (
          <>
            {activeTab === "Dashboard" && (
              <>
                <section style={styles.metrics}>
                  {[
                    {
                      label: "Equipment listed",
                      value: data.equipment.length,
                      detail: "Equipment records",
                    },
                    {
                      label: "Available now",
                      value: data.equipment.filter(
                        (item) =>
                          String(item.availability_status).toLowerCase() ===
                          "available"
                      ).length,
                      detail: "Ready for booking",
                    },
                    {
                      label: "Active bookings",
                      value: activeBookings.length,
                      detail: "Pending, confirmed or ongoing",
                    },
                    {
                      label: "Escrow payments",
                      value: money(heldAmount),
                      detail: "Amount marked as held",
                    },
                  ].map((metric) => (
                    <div key={metric.label} style={styles.metric}>
                      <div style={styles.muted}>{metric.label}</div>
                      <div style={styles.metricValue}>{metric.value}</div>
                      <div style={styles.muted}>{metric.detail}</div>
                    </div>
                  ))}
                </section>

                <section style={styles.panel}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "12px",
                    }}
                  >
                    <h3 style={styles.sectionHeading}>Equipment inventory</h3>
                    <button onClick={loadData} style={styles.button}>
                      {refreshing ? "Refreshing..." : "Refresh"}
                    </button>
                  </div>

                  <Table
                    columns={[
                      { label: "Equipment", key: "title" },
                      { label: "Category", key: "category_name" },
                      { label: "Owner", key: "owner_name" },
                      {
                        label: "Price/day",
                        render: (item) => money(item.price_per_day),
                      },
                      { label: "Status", key: "availability_status" },
                    ]}
                    rows={data.equipment.map((item) => ({
                      ...item,
                      id: item.equipment_id,
                    }))}
                    emptyMessage="No equipment records found."
                  />
                </section>
              </>
            )}

            {activeTab === "Equipment" && (
              <section style={styles.panel}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  <h3 style={styles.sectionHeading}>Equipment inventory</h3>
                  <button onClick={loadData} style={styles.button}>
                    Refresh
                  </button>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(200px, 1fr) 180px",
                    gap: "10px",
                  }}
                >
                  <input
                    style={styles.input}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search equipment, category or owner..."
                  />

                  <select
                    style={styles.input}
                    value={equipmentStatus}
                    onChange={(event) =>
                      setEquipmentStatus(event.target.value)
                    }
                  >
                    <option value="all">All statuses</option>
                    <option value="available">Available</option>
                    <option value="unavailable">Unavailable</option>
                    <option value="rented">Rented</option>
                  </select>
                </div>

                <Table
                  columns={[
                    { label: "Equipment ID", key: "equipment_id" },
                    { label: "Equipment", key: "title" },
                    { label: "Category", key: "category_name" },
                    { label: "Owner", key: "owner_name" },
                    {
                      label: "Price/day",
                      render: (item) => money(item.price_per_day),
                    },
                    { label: "Status", key: "availability_status" },
                  ]}
                  rows={filteredEquipment.map((item) => ({
                    ...item,
                    id: item.equipment_id,
                  }))}
                  emptyMessage="No equipment records found."
                />
              </section>
            )}

            {activeTab === "Bookings" && (
              <section style={styles.panel}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  <h3 style={styles.sectionHeading}>Booking records</h3>
                  <button onClick={loadData} style={styles.button}>
                    {refreshing ? "Refreshing..." : "Refresh"}
                  </button>
                </div>

                <form
                  onSubmit={handleCreateBooking}
                  style={{
                    ...styles.formBox,
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "12px",
                  }}
                >
                  <div style={{ gridColumn: "1 / -1" }}>
                    <h4 style={{ margin: "0 0 4px" }}>Create a booking</h4>
                    <p style={{ ...styles.muted, margin: 0, fontSize: "13px" }}>
                      Choose available equipment and rental dates. The amount
                      is calculated automatically.
                    </p>
                  </div>

                  <label style={{ fontSize: "13px", fontWeight: 700 }}>
                    Equipment
                    <select
                      style={{ ...styles.input, marginTop: "7px" }}
                      value={bookingEquipmentId}
                      onChange={(event) =>
                        setBookingEquipmentId(event.target.value)
                      }
                      required
                    >
                      <option value="">Select equipment</option>
                      {data.equipment
                        .filter(
                          (item) =>
                            String(item.availability_status).toLowerCase() ===
                            "available"
                        )
                        .map((item) => (
                          <option
                            key={item.equipment_id}
                            value={item.equipment_id}
                          >
                            {item.title} — {money(item.price_per_day)}/day
                          </option>
                        ))}
                    </select>
                  </label>

                  <label style={{ fontSize: "13px", fontWeight: 700 }}>
                    Start date
                    <input
                      type="date"
                      style={{
                              ...styles.input,
                              marginTop: "7px",
                              colorScheme: "light",
                            }}
                      value={bookingStartDate}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(event) =>
                        setBookingStartDate(event.target.value)
                      }
                      required
                    />
                  </label>

                  <label style={{
                              ...styles.input,
                              marginTop: "7px",
                              colorScheme: "light",
                            }}>
                    End date
                    <input
                      type="date"
                      style={{ ...styles.input, marginTop: "7px" }}
                      value={bookingEndDate}
                      min={
                        bookingStartDate ||
                        new Date().toISOString().slice(0, 10)
                      }
                      onChange={(event) =>
                        setBookingEndDate(event.target.value)
                      }
                      required
                    />
                  </label>

                  <div style={{ alignSelf: "end" }}>
                    <div style={{ fontSize: "12px", color: "#61758f" }}>
                      Estimated total
                    </div>
                    <strong style={{ fontSize: "19px" }}>
                      {money(estimatedBookingTotal)}
                    </strong>
                    {rentalDays > 0 && (
                      <div style={{ fontSize: "12px", color: "#61758f" }}>
                        {rentalDays} day(s)
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      gridColumn: "1 / -1",
                      display: "flex",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "12px",
                    }}
                  >
                    <button
                      type="submit"
                      disabled={bookingSubmitting}
                      style={styles.primaryButton}
                    >
                      {bookingSubmitting ? "Creating..." : "Create booking"}
                    </button>
                    {bookingMessage && (
                      <span style={{ fontSize: "13px" }}>
                        {bookingMessage}
                      </span>
                    )}
                  </div>
                </form>

                <input
                  style={styles.input}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search booking ID, equipment ID or status..."
                />

                {bookingActionMessage && (
                  <div
                    role="status"
                    style={
                      bookingActionMessageType === "success"
                        ? styles.success
                        : styles.error
                    }
                  >
                    {bookingActionMessage}
                  </div>
                )}

                <Table
                  columns={[
                    { label: "Booking ID", key: "booking_id" },
                    {
                      label: "Equipment",
                      render: (item) =>
                        item.equipment_title ||
                        `Equipment #${item.equipment_id}`,
                    },
                    { label: "Equipment ID", key: "equipment_id" },
                    { label: "Renter ID", key: "renter_id" },
                    {
                      label: "Start date",
                      render: (item) => displayDate(item.start_date),
                    },
                    {
                      label: "End date",
                      render: (item) => displayDate(item.end_date),
                    },
                    {
                      label: "Total",
                      render: (item) => money(item.total_amount),
                    },
                    { label: "Status", key: "status" },
                    {
                      label: "Owner action",
                      render: (item) => {
                        const isMyEquipment =
                          Number(item.equipment_owner_user_id) ===
                          Number(user?.user_id);

                        const isPending =
                          String(item.status).toLowerCase() === "pending";

                        if (!isMyEquipment || !isPending) {
                          return "—";
                        }

                        return (
                          <div
                            style={{
                              display: "flex",
                              gap: "8px",
                              flexWrap: "wrap",
                            }}
                          >
                            <button
                              type="button"
                              style={styles.primaryButton}
                              disabled={
                                updatingBookingId === item.booking_id
                              }
                              onClick={() =>
                                handleBookingAction(
                                  item.booking_id,
                                  "confirm"
                                )
                              }
                            >
                              {updatingBookingId === item.booking_id
                                ? "Updating..."
                                : "Confirm"}
                            </button>

                            <button
                              type="button"
                              style={{
                                ...styles.button,
                                color: "#b42318",
                              }}
                              disabled={
                                updatingBookingId === item.booking_id
                              }
                              onClick={() =>
                                handleBookingAction(
                                  item.booking_id,
                                  "reject"
                                )
                              }
                            >
                              Reject
                            </button>
                          </div>
                        );
                      },
                    },
                  ]}
                  rows={bookingSearchResults.map((item) => ({
                    ...item,
                    id: item.booking_id,
                  }))}
                  emptyMessage="No booking records found."
                />
              </section>
            )}

            {activeTab === "Payments" && (
              <section style={styles.panel}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  <h3 style={styles.sectionHeading}>Payments and escrow</h3>
                  <button onClick={loadData} style={styles.button}>
                    {refreshing ? "Refreshing..." : "Refresh"}
                  </button>
                </div>

                <section style={styles.metrics}>
                  <div style={styles.metric}>
                    <div style={styles.muted}>Total payments</div>
                    <div style={styles.metricValue}>
                      {data.payments.length}
                    </div>
                  </div>

                  <div style={styles.metric}>
                    <div style={styles.muted}>Total payment amount</div>
                    <div style={styles.metricValue}>
                      {money(
                        data.payments.reduce(
                          (total, payment) =>
                            total + Number(payment.amount || 0),
                          0
                        )
                      )}
                    </div>
                  </div>

                  <div style={styles.metric}>
                    <div style={styles.muted}>Held in escrow</div>
                    <div style={styles.metricValue}>{money(heldAmount)}</div>
                  </div>
                </section>

                {["renter", "both"].includes(user?.role) && (
                  <form
                    onSubmit={handleCreatePayment}
                    style={styles.formBox}
                  >
                    <h4 style={{ margin: "0 0 5px", fontSize: "18px" }}>
                      Create a payment
                    </h4>
                    <p style={{ ...styles.muted, marginTop: 0, fontSize: "13px" }}>
                      Select one of your unpaid bookings. The payment amount
                      will be taken directly from the booking record.
                    </p>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(190px, 1fr))",
                        gap: "14px",
                        alignItems: "end",
                      }}
                    >
                      <label style={{ fontSize: "13px", fontWeight: 700 }}>
                        Booking
                        <select
                          style={{ ...styles.input, marginTop: "7px" }}
                          value={paymentBookingId}
                          onChange={(event) =>
                            setPaymentBookingId(event.target.value)
                          }
                          required
                        >
                          <option value="">Select unpaid booking</option>
                          {unpaidBookings.map((booking) => (
                            <option
                              key={booking.booking_id}
                              value={booking.booking_id}
                            >
                              Booking #{booking.booking_id} —{" "}
                              {money(booking.total_amount)} — {booking.status}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label style={{ fontSize: "13px", fontWeight: 700 }}>
                        Payment method
                        <select
                          style={{ ...styles.input, marginTop: "7px" }}
                          value={paymentMethod}
                          onChange={(event) =>
                            setPaymentMethod(event.target.value)
                          }
                        >
                          <option value="upi">UPI</option>
                          <option value="card">Card</option>
                          <option value="netbanking">Net Banking</option>
                        </select>
                      </label>

                      <div>
                        <div style={{ fontSize: "12px", color: "#61758f" }}>
                          Payment amount
                        </div>
                        <strong style={{ fontSize: "20px" }}>
                          {money(selectedPaymentBooking?.total_amount || 0)}
                        </strong>
                      </div>

                      <button
                        type="submit"
                        disabled={paymentSubmitting || !paymentBookingId}
                        style={styles.primaryButton}
                      >
                        {paymentSubmitting ? "Processing..." : "Make payment"}
                      </button>
                    </div>

                    {unpaidBookings.length === 0 && (
                      <p style={{ ...styles.muted, fontSize: "13px" }}>
                        No unpaid bookings are available for payment.
                      </p>
                    )}
                  </form>
                )}

                {paymentMessage && (
                  <div
                    role="status"
                    style={
                      paymentMessageType === "success"
                        ? styles.success
                        : styles.error
                    }
                  >
                    {paymentMessage}
                  </div>
                )}

                <div style={{ marginTop: "20px" }}>
                  <h4 style={{ margin: "0 0 12px" }}>Payment history</h4>
                  <input
                    style={styles.input}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search payment ID, booking ID, method or escrow status..."
                  />
                </div>

                <Table
                  columns={[
                    { label: "Payment ID", key: "payment_id" },
                    { label: "Booking ID", key: "booking_id" },
                    {
                      label: "Amount",
                      render: (item) => money(item.amount),
                    },
                    { label: "Payment method", key: "payment_method" },
                    {
                      label: "Payment date",
                      render: (item) => displayDate(item.payment_date),
                    },
                    {
                      label: "Escrow status",
                      render: (item) => (
                        <span style={styles.badge}>
                          {item.escrow_status || "No escrow record"}
                        </span>
                      ),
                    },
                    {
                      label: "Booking status",
                      key: "booking_status",
                    },
                    {
                      label: "Action",
                      render: (item) =>
                        ["owner", "both"].includes(user?.role) &&
                        item.escrow_status === "held" ? (
                          <button
                            style={{
                              ...styles.primaryButton,
                              opacity:
                                releasingPaymentId === item.payment_id
                                  ? 0.6
                                  : 1,
                            }}
                            disabled={
                              releasingPaymentId === item.payment_id
                            }
                            onClick={() =>
                              handleReleaseEscrow(item.payment_id)
                            }
                          >
                            {releasingPaymentId === item.payment_id
                              ? "Releasing..."
                              : "Mark returned & release"}
                          </button>
                        ) : (
                          "—"
                        ),
                    },
                  ]}
                  rows={paymentSearchResults.map((item) => ({
                    ...item,
                    id: item.payment_id,
                  }))}
                  emptyMessage="No payment records found."
                />

                <p style={{ ...styles.muted, fontSize: "13px", marginTop: "16px" }}>
                  Escrow release is available to the equipment owner after
                  the booking has been confirmed or marked ongoing. The
                  server verifies ownership before releasing the escrow.
                </p>
              </section>
            )}

            {activeTab === "Users" && (
              <section style={styles.panel}>
                <h3 style={styles.sectionHeading}>Account information</h3>

                <p style={styles.muted}>
                  These details are fetched from your authenticated session
                  and the Users table in MySQL.
                </p>

                <Table
                  columns={[
                    { label: "Field", key: "field" },
                    { label: "Value", key: "value" },
                  ]}
                  rows={[
                    {
                      id: "user_id",
                      field: "User ID",
                      value: user?.user_id ?? "Not available",
                    },
                    {
                      id: "name",
                      field: "Name",
                      value: user?.name || "Not available",
                    },
                    {
                      id: "email",
                      field: "Email",
                      value: user?.email || "Not available",
                    },
                    {
                      id: "role",
                      field: "Role",
                      value: user?.role || "Not available",
                    },
                  ]}
                  emptyMessage="No account information available."
                />

                {!user && (
                  <div style={styles.error}>
                    User details could not be loaded. Please log out and log
                    in again, then refresh this page.
                  </div>
                )}

                <button
                  onClick={loadData}
                  style={{ ...styles.button, marginTop: "20px" }}
                >
                  Refresh account details
                </button>
              </section>
            )}
          </>
        )}
      </main>

      <footer style={styles.footer}>
        RentMate · Peer-to-Peer Equipment Rental · MySQL connected
      </footer>
    </div>
  );
}
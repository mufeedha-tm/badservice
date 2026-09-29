import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ComplaintGrid from '../components/complaints/ComplaintGrid.jsx';
import ComplaintPage from './ComplaintPage.jsx';
import ComplaintToolbar from '../components/complaints/ComplaintToolbar.jsx';
import MainLayout from '../components/layout/MainLayout.jsx';
import { searchComplaints } from '../services/api.js';

export default function ComplaintCollectionPage({ title, search }) {
  const isDateView = search?.period === 'today' || search?.date;

  const getTodayISO = () => new Date().toISOString().slice(0, 10);
  const getYesterdayISO = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  };

  const [selectedDate, setSelectedDate] = useState(getTodayISO());
  const [complaints, setComplaints] = useState([]);
  const [status, setStatus] = useState('loading');
  const [errorMsg, setErrorMsg] = useState('');

  const loadDateComplaints = (dateStr) => {
    setStatus('loading');
    setErrorMsg('');
    searchComplaints({ date: dateStr, sort: 'latest' })
      .then((results) => {
        setComplaints(results || []);
        setStatus((results || []).length > 0 ? 'success' : 'empty');
      })
      .catch(() => {
        setStatus('error');
        setErrorMsg('Unable to load complaints for this date. Please try again.');
      });
  };

  useEffect(() => {
    if (isDateView) {
      loadDateComplaints(selectedDate);
    }
  }, [selectedDate, isDateView]);

  if (!isDateView) {
    return (
      <MainLayout>
        <ComplaintPage title={title} search={search} />
      </MainLayout>
    );
  }

  function handleDateChange(e) {
    const newDate = e.target.value;
    if (!newDate) return;
    if (newDate > getTodayISO()) {
      setErrorMsg('Future dates cannot have complaints. Please select today or an earlier date.');
      return;
    }
    setSelectedDate(newDate);
  }

  const formatDisplayDate = (isoStr) => {
    try {
      const [y, m, d] = isoStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  const isToday = selectedDate === getTodayISO();
  const isYesterday = selectedDate === getYesterdayISO();

  return (
    <MainLayout>
      <section className="complaint-page" aria-labelledby="date-complaints-title">
        <div style={{ marginBottom: '1.25rem', background: '#fff', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 id="date-complaints-title" style={{ fontSize: '1.4rem', margin: '0 0 0.25rem 0', color: '#111' }}>
                📅 Complaints on {formatDisplayDate(selectedDate)}
              </h1>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>
                Select a date to inspect historical consumer complaints reported on that day.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setSelectedDate(getTodayISO())}
                style={{
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.85rem',
                  borderRadius: '4px',
                  border: isToday ? '2px solid #e47911' : '1px solid #cbd5e1',
                  background: isToday ? '#fff8f0' : '#fff',
                  fontWeight: isToday ? 700 : 500,
                  cursor: 'pointer',
                  color: isToday ? '#b12704' : '#333',
                }}
              >
                Today
              </button>

              <button
                type="button"
                onClick={() => setSelectedDate(getYesterdayISO())}
                style={{
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.85rem',
                  borderRadius: '4px',
                  border: isYesterday ? '2px solid #e47911' : '1px solid #cbd5e1',
                  background: isYesterday ? '#fff8f0' : '#fff',
                  fontWeight: isYesterday ? 700 : 500,
                  cursor: 'pointer',
                  color: isYesterday ? '#b12704' : '#333',
                }}
              >
                Yesterday
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <label htmlFor="calendar-date-picker" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#444' }}>
                  🗓️ Pick Date:
                </label>
                <input
                  id="calendar-date-picker"
                  type="date"
                  max={getTodayISO()}
                  value={selectedDate}
                  onChange={handleDateChange}
                  style={{
                    padding: '0.4rem 0.6rem',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <ComplaintToolbar
          search={{ period: isToday ? 'today' : selectedDate, sort: 'latest' }}
          resultCount={complaints.length}
          title={`Complaints on ${formatDisplayDate(selectedDate)}`}
        />

        {errorMsg && (
          <div style={{ padding: '1rem', background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: '6px', color: '#c53030', marginBottom: '1rem' }} role="alert">
            {errorMsg}
            <button
              type="button"
              onClick={() => loadDateComplaints(selectedDate)}
              style={{ marginLeft: '1rem', padding: '0.25rem 0.6rem', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              Retry
            </button>
          </div>
        )}

        {status === 'loading' && (
          <p className="complaint-list-state" role="status">
            Loading complaints for {formatDisplayDate(selectedDate)}...
          </p>
        )}

        {status === 'empty' && (
          <div className="complaint-list-state" style={{ padding: '3rem 1rem', textAlign: 'center', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
              No complaints found for {formatDisplayDate(selectedDate)}
            </h2>
            <p style={{ color: '#666', margin: '0 0 1.5rem 0', fontSize: '0.95rem' }}>
              No complaints were filed on this date, or they may have been resolved.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setSelectedDate(getTodayISO())}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1rem', border: '1px solid #ccc', borderRadius: '4px', background: '#fff', cursor: 'pointer' }}
              >
                View Today&apos;s Complaints
              </button>
              <Link
                to="/file-complaint"
                className="btn btn-primary"
                style={{
                  padding: '0.5rem 1rem',
                  background: '#e47911',
                  color: '#fff',
                  borderRadius: '4px',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                File a Complaint
              </Link>
            </div>
          </div>
        )}

        {status === 'success' && <ComplaintGrid complaints={complaints} />}
      </section>
    </MainLayout>
  );
}
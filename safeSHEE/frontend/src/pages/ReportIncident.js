import React, { useState } from 'react';
import ComplaintForm from '../components/ComplaintForm';
import { addComplaint } from '../mock/mockData';

function ReportIncident(){
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(payload){
    setSubmitting(true);
    // attach mock location
    navigator.geolocation.getCurrentPosition(async (pos)=>{
      const data = { ...payload, latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      await addComplaint(data);
      setSubmitting(false);
      setSuccess(true);
      setTimeout(()=>setSuccess(false), 3000);
    }, async ()=>{
      // if denied, still submit without location
      await addComplaint({ ...payload, latitude: 0, longitude: 0 });
      setSubmitting(false); setSuccess(true); setTimeout(()=>setSuccess(false), 3000);
    }, { enableHighAccuracy:true });
  }

  return (
    <div className="report-page">
      <h2>Report Incident</h2>
      <div className="panel">
        <ComplaintForm onSubmit={handleSubmit} />
        {submitting && <div className="small">Submitting...</div>}
        {success && <div className="success-anim">Submitted ✓</div>}
      </div>
    </div>
  );
}

export default ReportIncident;

import React, { useState } from 'react';

// ComplaintForm handles selecting type, description, optional image and anonymous toggle.
function ComplaintForm({ onSubmit }){
  const [type, setType] = useState('Harassment');
  const [description, setDescription] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [image, setImage] = useState(null);

  function handleFile(e){
    const f = e.target.files[0];
    if (f) {
      // store image as data URL for frontend-only preview
      const reader = new FileReader();
      reader.onload = () => setImage(reader.result);
      reader.readAsDataURL(f);
    }
  }

  function submit(e){
    e.preventDefault();
    onSubmit({ type, description, anonymous, image });
  }

  return (
    <form className="complaint-form" onSubmit={submit}>
      <label>Complaint Type</label>
      <select value={type} onChange={e=>setType(e.target.value)}>
        <option>Harassment</option>
        <option>Stalking</option>
        <option>Domestic Violence</option>
        <option>Unsafe Area</option>
        <option>Suspicious Activity</option>
      </select>

      <label>Description</label>
      <textarea value={description} onChange={e=>setDescription(e.target.value)} required />

      <label>Image (optional)</label>
      <input type="file" accept="image/*" onChange={handleFile} />
      {image && <img src={image} alt="preview" style={{maxWidth:120, marginTop:8, borderRadius:8}} />}

      <div style={{marginTop:8}}>
        <label><input type="checkbox" checked={anonymous} onChange={e=>setAnonymous(e.target.checked)} /> Submit anonymously</label>
      </div>

      <button className="btn-primary" type="submit" style={{marginTop:12}}>Submit Complaint</button>
    </form>
  );
}

export default ComplaintForm;

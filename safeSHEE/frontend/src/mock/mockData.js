// Mock data and simple in-memory store for frontend-only simulation.
const now = Date.now();

let alerts = [
  { id: 1, userId: 101, name: 'Alice', email: 'alice@example.com', latitude: 28.7041, longitude: 77.1025, timestamp: now - 100000, status: 'active', risk: 45 },
  { id: 2, userId: 102, name: 'Bob', email: 'bob@example.com', latitude: 19.0760, longitude: 72.8777, timestamp: now - 40000, status: 'active', risk: 78 },
  { id: 3, userId: 103, name: 'Carol', email: 'carol@example.com', latitude: 13.0827, longitude: 80.2707, timestamp: now - 200000, status: 'resolved', risk: 22 }
];

let complaints = [
  { id:1, type:'Harassment', description:'Man following me', anonymous:false, latitude:28.7045, longitude:77.1030, timestamp: now - 500000 },
  { id:2, type:'Unsafe Area', description:'Poorly lit street', anonymous:true, latitude:28.7043, longitude:77.1028, timestamp: now - 600000 }
];

let contacts = [
  { id:1, name:'Mom', phone:'+911234567890', primary:true },
  { id:2, name:'Friend', phone:'+919876543210', primary:false }
];

let unsafeZones = [
  { id:1, lat:28.7042, lng:77.1029, count:3, risk: 75 },
  { id:2, lat:19.0760, lng:72.8777, count:2, risk: 60 }
];

export function getAlerts(){ return Promise.resolve([...alerts]); }

export function updateAlertStatus(id, status){
  alerts = alerts.map(a => a.id === id ? { ...a, status } : a);
  return Promise.resolve({ success:true });
}

export function addComplaint(c){
  const newC = { id: Date.now(), ...c, timestamp: Date.now() };
  complaints.push(newC);
  // update unsafeZones by proximity (very naive)
  const nearby = unsafeZones.find(z => Math.abs(z.lat - c.latitude) < 0.01 && Math.abs(z.lng - c.longitude) < 0.01);
  if (nearby) { nearby.count += 1; nearby.risk = Math.min(100, nearby.risk + 10); }
  else { unsafeZones.push({ id: Date.now(), lat:c.latitude, lng:c.longitude, count:1, risk: 40 }); }
  return Promise.resolve(newC);
}

export function getComplaints(){ return Promise.resolve([...complaints]); }

export function getContacts(){ return Promise.resolve([...contacts]); }

export function saveContact(c){
  if (c.id){ contacts = contacts.map(x => x.id === c.id ? c : x); }
  else { c.id = Date.now(); contacts.push(c); }
  if (c.primary) contacts = contacts.map(x => x.id === c.id ? x : { ...x, primary:false });
  return Promise.resolve({ success:true, contact:c });
}

export function deleteContact(id){ contacts = contacts.filter(c => c.id !== id); return Promise.resolve({ success:true }); }

export function getUnsafeZones(){ return Promise.resolve([...unsafeZones]); }

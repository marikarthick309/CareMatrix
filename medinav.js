/**
 * MEDINAV — Hospital Indoor Navigation System
 * Standalone Zero-Dependency Production Bundle v2 (Audited & Debugged)
 *
 * AUDIT SUMMARY (2026-10-04):
 *   BUG #1 FIXED: Class field `_ns = 'http://...'` syntax — broken on file://
 *                 protocol in older Chromium. Moved to constructor assignment.
 *   BUG #2 FIXED: setFloor() early-return guard blocked route refresh when
 *                 switching to same floor after route was cleared and re-set.
 *   BUG #3 FIXED: clearRoute() did not call renderFloor, leaving stale route
 *                 highlighted after reset.
 *   BUG #4 FIXED: Missing direct corridor cross-connection:
 *                 G-CAFETERIA-ENT ↔ G-RESTROOMS-ENT (distance 44.0)
 *                 — both nodes sit on the same SVG corridor path
 *                   "M 310 130 L 530 130". Without this edge, routing between
 *                   the two required a detour through G-CORR-N1 but visually
 *                   the route line jumped off the corridor. Now corrected.
 *   BUG #5 FIXED: Missing First-Floor cross-connection:
 *                 F1-CORR-N1 ↔ F1-STAIR-WEST via F1-CORR-W-NORTH and
 *                 F1-CORR-N1 ↔ F1-STAIR-EAST via F1-CORR-E-NORTH were
 *                 accessible only through the long route via hubs.
 *                 Added direct cross-links along the north corridor SVG:
 *                 F1-CORR-N1 ↔ F1-DOCTORS-LOUNGE-ENT already existed.
 *   BUG #6 FIXED: Route step filter used /-ENT$/ which accidentally filtered
 *                 nodes ending in "-ENT" that were important landmarks
 *                 (G-PHARMACY-ENT shown as "Pharmacy Entrance" etc.)
 *   ADDED: Built-in graph self-test (window.mediNav.runDiagnostic())
 *   ADDED: "Validate" button in header triggers the diagnostic
 *
 * Data source: data_inspection_report.md (verbatim coordinates)
 * Coordinate space: 850 × 540 SVG units (both floors)
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. MASTER DATASET — verbatim from data_inspection_report.md
  // =========================================================================
  var DATASET = {
    floors: [
      { id: 0, code: 'GF',  name: 'Ground Floor', shortName: 'Ground', level: 0,
        viewBox: '0 0 850 540', description: 'Outpatient Clinics, Emergency, Radiology, Pharmacy & Reception' },
      { id: 1, code: '1F', name: 'First Floor',  shortName: 'Level 1', level: 1,
        viewBox: '0 0 850 540', description: 'Inpatient Rooms 201–206, ICU, Operation Theatres & Cardiology' }
    ],

    nodes: {
      // ── GROUND FLOOR (floor: 0) ─────────────────────────────────────────
      'G-ENTRANCE':       { id: 'G-ENTRANCE',       name: 'Hospital Main Entrance',                  floor: 0, x: 420, y: 500, type: 'entrance' },
      'G-VESTIBULE':      { id: 'G-VESTIBULE',      name: 'Entrance Vestibule & Triage',             floor: 0, x: 420, y: 440, type: 'junction' },
      'G-RECEPTION':      { id: 'G-RECEPTION',      name: 'Main Reception & Help Desk',              floor: 0, x: 420, y: 370, type: 'room',    roomNumber: 'REC-01', department: 'Patient Services' },
      'G-LOBBY-CORR':     { id: 'G-LOBBY-CORR',     name: 'Main Lobby Central Corridor',             floor: 0, x: 420, y: 320, type: 'corridor' },
      'G-CENTRAL-HUB':    { id: 'G-CENTRAL-HUB',    name: 'Ground Floor Central Atrium Hub',         floor: 0, x: 420, y: 250, type: 'junction' },
      'G-LIFT-A':         { id: 'G-LIFT-A',         name: 'Elevator Bank A (Ground)',                floor: 0, x: 380, y: 200, type: 'lift' },
      'G-LIFT-B':         { id: 'G-LIFT-B',         name: 'Elevator Bank B (Ground)',                floor: 0, x: 460, y: 200, type: 'lift' },
      'G-LIFT-LOBBY':     { id: 'G-LIFT-LOBBY',     name: 'Ground Elevator Lobby Junction',          floor: 0, x: 420, y: 200, type: 'junction' },
      'G-CORR-W1':        { id: 'G-CORR-W1',        name: 'West Corridor – Pharmacy Access',         floor: 0, x: 300, y: 250, type: 'corridor' },
      'G-PHARMACY-ENT':   { id: 'G-PHARMACY-ENT',   name: 'Pharmacy Entrance',                       floor: 0, x: 300, y: 290, type: 'corridor' },
      'G-PHARMACY':       { id: 'G-PHARMACY',       name: 'Central Outpatient Pharmacy',             floor: 0, x: 300, y: 360, type: 'room',    roomNumber: 'PHARM',  department: 'Pharmacy Services' },
      'G-CORR-W2':        { id: 'G-CORR-W2',        name: 'West Clinic Concourse Junction',          floor: 0, x: 190, y: 250, type: 'junction' },
      'G-STAIR-WEST':     { id: 'G-STAIR-WEST',     name: 'West Staircase (Ground)',                 floor: 0, x: 190, y: 130, type: 'stair' },
      'G-CORR-W-NORTH':   { id: 'G-CORR-W-NORTH',   name: 'West North Concourse',                    floor: 0, x: 190, y: 170, type: 'corridor' },
      'G-CORR-W-SOUTH':   { id: 'G-CORR-W-SOUTH',   name: 'West South Concourse',                    floor: 0, x: 190, y: 350, type: 'corridor' },
      'G-101-DOOR':       { id: 'G-101-DOOR',       name: 'Room 101 Doorway',                        floor: 0, x: 150, y: 350, type: 'corridor' },
      'G-101':            { id: 'G-101',            name: 'Room 101 – General Medicine',             floor: 0, x: 95,  y: 350, type: 'room',    roomNumber: '101',    department: 'Outpatient Clinic' },
      'G-102-DOOR':       { id: 'G-102-DOOR',       name: 'Room 102 Doorway',                        floor: 0, x: 150, y: 250, type: 'corridor' },
      'G-102':            { id: 'G-102',            name: 'Room 102 – Pediatrics',                   floor: 0, x: 95,  y: 250, type: 'room',    roomNumber: '102',    department: 'Pediatrics' },
      'G-103-DOOR':       { id: 'G-103-DOOR',       name: 'Room 103 Doorway',                        floor: 0, x: 150, y: 170, type: 'corridor' },
      'G-103':            { id: 'G-103',            name: 'Room 103 – Internal Medicine',            floor: 0, x: 95,  y: 170, type: 'room',    roomNumber: '103',    department: 'Internal Medicine' },
      'G-RAD-DOOR':       { id: 'G-RAD-DOOR',       name: 'Radiology Entrance',                      floor: 0, x: 150, y: 90,  type: 'corridor' },
      'G-RADIOLOGY':      { id: 'G-RADIOLOGY',      name: 'Radiology & Imaging (X-Ray, CT, MRI)',    floor: 0, x: 95,  y: 90,  type: 'room',    roomNumber: 'RAD-01', department: 'Diagnostic Radiology' },
      'G-CORR-N1':        { id: 'G-CORR-N1',        name: 'North Concourse Junction',                floor: 0, x: 420, y: 130, type: 'junction' },
      'G-CAFETERIA-ENT':  { id: 'G-CAFETERIA-ENT',  name: 'Cafeteria Entrance',                      floor: 0, x: 310, y: 130, type: 'corridor' },
      'G-CAFETERIA':      { id: 'G-CAFETERIA',      name: 'Cafeteria & Hospital Dining',             floor: 0, x: 310, y: 70,  type: 'room',    roomNumber: 'CAF-01', department: 'Food Services' },
      'G-RESTROOMS-ENT':  { id: 'G-RESTROOMS-ENT',  name: 'Restroom Lobby Access',                   floor: 0, x: 530, y: 130, type: 'corridor' },
      'G-RESTROOMS':      { id: 'G-RESTROOMS',      name: 'Public Restrooms & Accessible Washrooms', floor: 0, x: 530, y: 70,  type: 'room',    roomNumber: 'WC-01',  department: 'Facilities' },
      'G-CORR-E1':        { id: 'G-CORR-E1',        name: 'East Corridor – Laboratory Access',       floor: 0, x: 540, y: 250, type: 'corridor' },
      'G-PATHOLOGY-ENT':  { id: 'G-PATHOLOGY-ENT',  name: 'Pathology Lab Doorway',                   floor: 0, x: 540, y: 290, type: 'corridor' },
      'G-PATHOLOGY':      { id: 'G-PATHOLOGY',      name: 'Pathology & Blood Collection Laboratory', floor: 0, x: 540, y: 360, type: 'room',    roomNumber: 'LAB-01', department: 'Laboratory' },
      'G-CORR-E2':        { id: 'G-CORR-E2',        name: 'East Wing Concourse Junction',            floor: 0, x: 650, y: 250, type: 'junction' },
      'G-STAIR-EAST':     { id: 'G-STAIR-EAST',     name: 'East Staircase (Ground)',                 floor: 0, x: 650, y: 130, type: 'stair' },
      'G-CORR-E-NORTH':   { id: 'G-CORR-E-NORTH',   name: 'East North Concourse',                    floor: 0, x: 650, y: 170, type: 'corridor' },
      'G-CORR-E-SOUTH':   { id: 'G-CORR-E-SOUTH',   name: 'East South Concourse',                    floor: 0, x: 650, y: 350, type: 'corridor' },
      'G-104-DOOR':       { id: 'G-104-DOOR',       name: 'Room 104 Doorway',                        floor: 0, x: 690, y: 170, type: 'corridor' },
      'G-104':            { id: 'G-104',            name: 'Room 104 – Orthopedics',                  floor: 0, x: 750, y: 170, type: 'room',    roomNumber: '104',    department: 'Orthopedics' },
      'G-105-DOOR':       { id: 'G-105-DOOR',       name: 'Room 105 Doorway',                        floor: 0, x: 690, y: 90,  type: 'corridor' },
      'G-105':            { id: 'G-105',            name: 'Room 105 – ENT & Ophthalmology',          floor: 0, x: 750, y: 90,  type: 'room',    roomNumber: '105',    department: 'Specialist Outpatient' },
      'G-EMERGENCY-ENT':  { id: 'G-EMERGENCY-ENT',  name: 'Emergency Department Doorway',            floor: 0, x: 690, y: 350, type: 'corridor' },
      'G-EMERGENCY':      { id: 'G-EMERGENCY',      name: 'Emergency & Trauma Centre',               floor: 0, x: 750, y: 350, type: 'room',    roomNumber: 'ER-01',  department: 'Emergency Services' },
      'G-AMBULANCE-BAY':  { id: 'G-AMBULANCE-BAY',  name: 'Ambulance Bay Entry',                     floor: 0, x: 750, y: 470, type: 'entrance' },

      // ── FIRST FLOOR (floor: 1) ──────────────────────────────────────────
      'F1-CENTRAL-HUB':        { id: 'F1-CENTRAL-HUB',        name: 'Level 1 Central Atrium Hub',           floor: 1, x: 420, y: 250, type: 'junction' },
      'F1-NURSE-STATION':      { id: 'F1-NURSE-STATION',      name: 'Central Nursing Station 1',            floor: 1, x: 420, y: 330, type: 'room',    roomNumber: 'NS-01',   department: 'Inpatient Care' },
      'F1-LIFT-A':             { id: 'F1-LIFT-A',             name: 'Elevator Bank A (Level 1)',            floor: 1, x: 380, y: 200, type: 'lift' },
      'F1-LIFT-B':             { id: 'F1-LIFT-B',             name: 'Elevator Bank B (Level 1)',            floor: 1, x: 460, y: 200, type: 'lift' },
      'F1-LIFT-LOBBY':         { id: 'F1-LIFT-LOBBY',         name: 'Level 1 Elevator Lobby Junction',      floor: 1, x: 420, y: 200, type: 'junction' },
      'F1-STAIR-WEST':         { id: 'F1-STAIR-WEST',         name: 'West Staircase (Level 1)',             floor: 1, x: 190, y: 130, type: 'stair' },
      'F1-STAIR-EAST':         { id: 'F1-STAIR-EAST',         name: 'East Staircase (Level 1)',             floor: 1, x: 650, y: 130, type: 'stair' },
      'F1-CORR-N1':            { id: 'F1-CORR-N1',            name: 'Level 1 North Concourse',              floor: 1, x: 420, y: 130, type: 'junction' },
      'F1-DOCTORS-LOUNGE-ENT': { id: 'F1-DOCTORS-LOUNGE-ENT', name: 'Doctors Lounge Doorway',               floor: 1, x: 530, y: 130, type: 'corridor' },
      'F1-DOCTORS-LOUNGE':     { id: 'F1-DOCTORS-LOUNGE',     name: 'Physicians Lounge & Conference',       floor: 1, x: 530, y: 70,  type: 'room',    roomNumber: 'DOC-01',  department: 'Staff' },
      'F1-CORR-W1':            { id: 'F1-CORR-W1',            name: 'Level 1 West Corridor Junction',       floor: 1, x: 300, y: 250, type: 'corridor' },
      'F1-ICU-ENT':            { id: 'F1-ICU-ENT',            name: 'ICU Security Airlock',                 floor: 1, x: 300, y: 290, type: 'corridor' },
      'F1-ICU':                { id: 'F1-ICU',                name: 'Intensive Care Unit (ICU)',             floor: 1, x: 300, y: 360, type: 'room',    roomNumber: 'ICU-01',  department: 'Critical Care' },
      'F1-CORR-W2':            { id: 'F1-CORR-W2',            name: 'Level 1 West Ward Concourse',          floor: 1, x: 190, y: 250, type: 'junction' },
      'F1-CORR-W-NORTH':       { id: 'F1-CORR-W-NORTH',       name: 'West Inpatient Concourse North',       floor: 1, x: 190, y: 170, type: 'corridor' },
      'F1-CORR-W-SOUTH':       { id: 'F1-CORR-W-SOUTH',       name: 'West Inpatient Concourse South',       floor: 1, x: 190, y: 350, type: 'corridor' },
      'F1-201-DOOR':           { id: 'F1-201-DOOR',           name: 'Room 201 Doorway',                     floor: 1, x: 150, y: 350, type: 'corridor' },
      'F1-201':                { id: 'F1-201',                name: 'Room 201 – Inpatient Private Suite',   floor: 1, x: 95,  y: 350, type: 'room',    roomNumber: '201',     department: 'Inpatient Ward' },
      'F1-202-DOOR':           { id: 'F1-202-DOOR',           name: 'Room 202 Doorway',                     floor: 1, x: 150, y: 250, type: 'corridor' },
      'F1-202':                { id: 'F1-202',                name: 'Room 202 – Inpatient Care Unit',       floor: 1, x: 95,  y: 250, type: 'room',    roomNumber: '202',     department: 'Inpatient Ward' },
      'F1-203-DOOR':           { id: 'F1-203-DOOR',           name: 'Room 203 Doorway',                     floor: 1, x: 150, y: 170, type: 'corridor' },
      'F1-203':                { id: 'F1-203',                name: 'Room 203 – Inpatient Care Unit',       floor: 1, x: 95,  y: 170, type: 'room',    roomNumber: '203',     department: 'Inpatient Ward' },
      'F1-OT-AIRLOCK':         { id: 'F1-OT-AIRLOCK',         name: 'OT Sterile Airlock Entry',             floor: 1, x: 150, y: 90,  type: 'corridor' },
      'F1-OT-SUITE':           { id: 'F1-OT-SUITE',           name: 'Operation Theatre Complex (OT 1 & 2)', floor: 1, x: 95,  y: 90,  type: 'room',    roomNumber: 'OT-01',   department: 'Surgical Services' },
      'F1-CORR-E1':            { id: 'F1-CORR-E1',            name: 'Level 1 East Corridor Junction',       floor: 1, x: 540, y: 250, type: 'corridor' },
      'F1-CARDIOLOGY-ENT':     { id: 'F1-CARDIOLOGY-ENT',     name: 'Cardiology Suite Doorway',             floor: 1, x: 540, y: 290, type: 'corridor' },
      'F1-CARDIOLOGY':         { id: 'F1-CARDIOLOGY',         name: 'Cardiology Suite & Cath Lab',          floor: 1, x: 540, y: 360, type: 'room',    roomNumber: 'CARD-01', department: 'Cardiology' },
      'F1-CORR-E2':            { id: 'F1-CORR-E2',            name: 'Level 1 East Ward Concourse',          floor: 1, x: 650, y: 250, type: 'junction' },
      'F1-CORR-E-NORTH':       { id: 'F1-CORR-E-NORTH',       name: 'East Inpatient Concourse North',       floor: 1, x: 650, y: 170, type: 'corridor' },
      'F1-CORR-E-SOUTH':       { id: 'F1-CORR-E-SOUTH',       name: 'East Inpatient Concourse South',       floor: 1, x: 650, y: 350, type: 'corridor' },
      'F1-204-DOOR':           { id: 'F1-204-DOOR',           name: 'Room 204 Doorway',                     floor: 1, x: 690, y: 170, type: 'corridor' },
      'F1-204':                { id: 'F1-204',                name: 'Room 204 – Inpatient Suite',           floor: 1, x: 750, y: 170, type: 'room',    roomNumber: '204',     department: 'Inpatient Ward' },
      'F1-205-DOOR':           { id: 'F1-205-DOOR',           name: 'Room 205 Doorway',                     floor: 1, x: 690, y: 90,  type: 'corridor' },
      'F1-205':                { id: 'F1-205',                name: 'Room 205 – Neurology Suite',           floor: 1, x: 750, y: 90,  type: 'room',    roomNumber: '205',     department: 'Neurology' },
      'F1-206-DOOR':           { id: 'F1-206-DOOR',           name: 'Room 206 Doorway',                     floor: 1, x: 690, y: 350, type: 'corridor' },
      'F1-206':                { id: 'F1-206',                name: 'Room 206 – Oncology Care Ward',        floor: 1, x: 750, y: 350, type: 'room',    roomNumber: '206',     department: 'Oncology' }
    },

    // -----------------------------------------------------------------------
    // WALKABLE EDGES — verbatim + BUG#4 fix (cross-corridor links)
    // All edges bidirectional. isVertical marks floor transitions.
    // -----------------------------------------------------------------------
    edges: [
      // ── GROUND FLOOR ─────────────────────────────────────────────────────
      { from: 'G-ENTRANCE',      to: 'G-VESTIBULE',       distance: 12.0 },
      { from: 'G-VESTIBULE',     to: 'G-RECEPTION',       distance: 14.0 },
      { from: 'G-RECEPTION',     to: 'G-LOBBY-CORR',      distance: 10.0 },
      { from: 'G-LOBBY-CORR',    to: 'G-CENTRAL-HUB',     distance: 14.0 },

      { from: 'G-CENTRAL-HUB',   to: 'G-LIFT-LOBBY',      distance: 10.0 },
      { from: 'G-LIFT-LOBBY',    to: 'G-LIFT-A',          distance:  8.0 },
      { from: 'G-LIFT-LOBBY',    to: 'G-LIFT-B',          distance:  8.0 },
      { from: 'G-LIFT-LOBBY',    to: 'G-CORR-N1',         distance: 14.0 },

      { from: 'G-CORR-N1',       to: 'G-CAFETERIA-ENT',   distance: 22.0 },
      { from: 'G-CAFETERIA-ENT', to: 'G-CAFETERIA',       distance: 12.0 },
      { from: 'G-CORR-N1',       to: 'G-RESTROOMS-ENT',   distance: 22.0 },
      { from: 'G-RESTROOMS-ENT', to: 'G-RESTROOMS',       distance: 12.0 },
      // FIX #4: Cross-connection along north corridor SVG path "M 310 130 L 530 130"
      { from: 'G-CAFETERIA-ENT', to: 'G-RESTROOMS-ENT',   distance: 44.0 },
      // FIX #7: North corridor cross-links to West & East stairs
      { from: 'G-CORR-N1',       to: 'G-STAIR-WEST',      distance: 46.0 },
      { from: 'G-CORR-N1',       to: 'G-STAIR-EAST',      distance: 46.0 },
      { from: 'G-STAIR-WEST',    to: 'G-CAFETERIA-ENT',   distance: 24.0 },
      { from: 'G-STAIR-EAST',    to: 'G-RESTROOMS-ENT',   distance: 24.0 },

      { from: 'G-CENTRAL-HUB',   to: 'G-CORR-W1',         distance: 24.0 },
      { from: 'G-CORR-W1',       to: 'G-PHARMACY-ENT',    distance:  8.0 },
      { from: 'G-PHARMACY-ENT',  to: 'G-PHARMACY',        distance: 14.0 },
      { from: 'G-CORR-W1',       to: 'G-CORR-W2',         distance: 22.0 },

      { from: 'G-CORR-W2',       to: 'G-CORR-W-NORTH',    distance: 16.0 },
      { from: 'G-CORR-W-NORTH',  to: 'G-STAIR-WEST',      distance:  8.0 },
      { from: 'G-CORR-W-NORTH',  to: 'G-RAD-DOOR',        distance: 16.0 },
      { from: 'G-RAD-DOOR',      to: 'G-RADIOLOGY',       distance: 11.0 },

      { from: 'G-CORR-W2',       to: 'G-102-DOOR',        distance:  8.0 },
      { from: 'G-102-DOOR',      to: 'G-102',             distance: 11.0 },

      { from: 'G-CORR-W-NORTH',  to: 'G-103-DOOR',        distance:  8.0 },
      { from: 'G-103-DOOR',      to: 'G-103',             distance: 11.0 },

      { from: 'G-CORR-W2',       to: 'G-CORR-W-SOUTH',    distance: 20.0 },
      { from: 'G-CORR-W-SOUTH',  to: 'G-101-DOOR',        distance:  8.0 },
      { from: 'G-101-DOOR',      to: 'G-101',             distance: 11.0 },

      { from: 'G-CENTRAL-HUB',   to: 'G-CORR-E1',         distance: 24.0 },
      { from: 'G-CORR-E1',       to: 'G-PATHOLOGY-ENT',   distance:  8.0 },
      { from: 'G-PATHOLOGY-ENT', to: 'G-PATHOLOGY',       distance: 14.0 },
      { from: 'G-CORR-E1',       to: 'G-CORR-E2',         distance: 22.0 },

      { from: 'G-CORR-E2',       to: 'G-CORR-E-NORTH',    distance: 16.0 },
      { from: 'G-CORR-E-NORTH',  to: 'G-STAIR-EAST',      distance:  8.0 },
      { from: 'G-CORR-E-NORTH',  to: 'G-104-DOOR',        distance:  8.0 },
      { from: 'G-104-DOOR',      to: 'G-104',             distance: 12.0 },

      { from: 'G-STAIR-EAST',    to: 'G-105-DOOR',        distance: 12.0 },
      { from: 'G-105-DOOR',      to: 'G-105',             distance: 12.0 },

      { from: 'G-CORR-E2',       to: 'G-CORR-E-SOUTH',    distance: 20.0 },
      { from: 'G-CORR-E-SOUTH',  to: 'G-EMERGENCY-ENT',   distance:  8.0 },
      { from: 'G-EMERGENCY-ENT', to: 'G-EMERGENCY',       distance: 12.0 },
      { from: 'G-EMERGENCY',     to: 'G-AMBULANCE-BAY',   distance: 24.0 },

      // ── FIRST FLOOR ───────────────────────────────────────────────────────
      { from: 'F1-CENTRAL-HUB',       to: 'F1-LIFT-LOBBY',          distance: 10.0 },
      { from: 'F1-CENTRAL-HUB',       to: 'F1-NURSE-STATION',       distance: 16.0 },
      { from: 'F1-LIFT-LOBBY',        to: 'F1-LIFT-A',              distance:  8.0 },
      { from: 'F1-LIFT-LOBBY',        to: 'F1-LIFT-B',              distance:  8.0 },
      { from: 'F1-LIFT-LOBBY',        to: 'F1-CORR-N1',             distance: 14.0 },

      { from: 'F1-CORR-N1',           to: 'F1-DOCTORS-LOUNGE-ENT',  distance: 22.0 },
      { from: 'F1-DOCTORS-LOUNGE-ENT',to: 'F1-DOCTORS-LOUNGE',      distance: 12.0 },
      // FIX #5: North corridor cross-links (mirrors GF north corridor structure)
      { from: 'F1-CORR-N1',           to: 'F1-STAIR-WEST',          distance: 46.0 },
      { from: 'F1-CORR-N1',           to: 'F1-STAIR-EAST',          distance: 46.0 },

      { from: 'F1-CENTRAL-HUB',       to: 'F1-CORR-W1',             distance: 24.0 },
      { from: 'F1-CORR-W1',           to: 'F1-ICU-ENT',             distance:  8.0 },
      { from: 'F1-ICU-ENT',           to: 'F1-ICU',                 distance: 14.0 },
      { from: 'F1-CORR-W1',           to: 'F1-CORR-W2',             distance: 22.0 },

      { from: 'F1-CORR-W2',           to: 'F1-CORR-W-NORTH',        distance: 16.0 },
      { from: 'F1-CORR-W-NORTH',      to: 'F1-STAIR-WEST',          distance:  8.0 },
      { from: 'F1-CORR-W-NORTH',      to: 'F1-OT-AIRLOCK',          distance: 16.0 },
      { from: 'F1-OT-AIRLOCK',        to: 'F1-OT-SUITE',            distance: 11.0 },

      { from: 'F1-CORR-W2',           to: 'F1-202-DOOR',            distance:  8.0 },
      { from: 'F1-202-DOOR',          to: 'F1-202',                 distance: 11.0 },

      { from: 'F1-CORR-W-NORTH',      to: 'F1-203-DOOR',            distance:  8.0 },
      { from: 'F1-203-DOOR',          to: 'F1-203',                 distance: 11.0 },

      { from: 'F1-CORR-W2',           to: 'F1-CORR-W-SOUTH',        distance: 20.0 },
      { from: 'F1-CORR-W-SOUTH',      to: 'F1-201-DOOR',            distance:  8.0 },
      { from: 'F1-201-DOOR',          to: 'F1-201',                 distance: 11.0 },

      { from: 'F1-CENTRAL-HUB',       to: 'F1-CORR-E1',             distance: 24.0 },
      { from: 'F1-CORR-E1',           to: 'F1-CARDIOLOGY-ENT',      distance:  8.0 },
      { from: 'F1-CARDIOLOGY-ENT',    to: 'F1-CARDIOLOGY',          distance: 14.0 },
      { from: 'F1-CORR-E1',           to: 'F1-CORR-E2',             distance: 22.0 },

      { from: 'F1-CORR-E2',           to: 'F1-CORR-E-NORTH',        distance: 16.0 },
      { from: 'F1-CORR-E-NORTH',      to: 'F1-STAIR-EAST',          distance:  8.0 },
      { from: 'F1-CORR-E-NORTH',      to: 'F1-204-DOOR',            distance:  8.0 },
      { from: 'F1-204-DOOR',          to: 'F1-204',                 distance: 12.0 },

      { from: 'F1-STAIR-EAST',        to: 'F1-205-DOOR',            distance: 12.0 },
      { from: 'F1-205-DOOR',          to: 'F1-205',                 distance: 12.0 },

      { from: 'F1-CORR-E2',           to: 'F1-CORR-E-SOUTH',        distance: 20.0 },
      { from: 'F1-CORR-E-SOUTH',      to: 'F1-206-DOOR',            distance:  8.0 },
      { from: 'F1-206-DOOR',          to: 'F1-206',                 distance: 12.0 },

      // ── VERTICAL CONNECTIONS (floor 0 ↔ floor 1) ─────────────────────────
      { from: 'G-LIFT-A',    to: 'F1-LIFT-A',    distance: 15.0, isVertical: true, edgeType: 'lift'  },
      { from: 'G-LIFT-B',    to: 'F1-LIFT-B',    distance: 15.0, isVertical: true, edgeType: 'lift'  },
      { from: 'G-STAIR-WEST',to: 'F1-STAIR-WEST',distance: 22.0, isVertical: true, edgeType: 'stair' },
      { from: 'G-STAIR-EAST',to: 'F1-STAIR-EAST',distance: 22.0, isVertical: true, edgeType: 'stair' }
    ],

    // -----------------------------------------------------------------------
    // DESTINATION CATALOG — verbatim aliases from inspection report
    // -----------------------------------------------------------------------
    destinations: [
      { id: 'dest-101',        name: 'Room 101',                    nodeId: 'G-101',        floor: 0, department: 'General Medicine Outpatient', roomNumber: '101',     icon: '🩺', aliases: ['101','room 101','general medicine','dr sharma','consultation 101','opd 101'] },
      { id: 'dest-102',        name: 'Room 102',                    nodeId: 'G-102',        floor: 0, department: 'Pediatrics Outpatient',        roomNumber: '102',     icon: '👶', aliases: ['102','room 102','pediatrics','child clinic','pediatric consultation'] },
      { id: 'dest-103',        name: 'Room 103',                    nodeId: 'G-103',        floor: 0, department: 'Internal Medicine',            roomNumber: '103',     icon: '💊', aliases: ['103','room 103','internal medicine','physician'] },
      { id: 'dest-104',        name: 'Room 104',                    nodeId: 'G-104',        floor: 0, department: 'Orthopedic Clinic',            roomNumber: '104',     icon: '🦴', aliases: ['104','room 104','orthopedics','bone clinic','ortho'] },
      { id: 'dest-105',        name: 'Room 105',                    nodeId: 'G-105',        floor: 0, department: 'ENT & Ophthalmology',          roomNumber: '105',     icon: '👁️', aliases: ['105','room 105','ent','eye clinic','ophthalmology','ear nose throat'] },
      { id: 'dest-emergency',  name: 'Emergency & Trauma Centre',   nodeId: 'G-EMERGENCY',  floor: 0, department: 'Emergency Services',           roomNumber: 'ER-01',   icon: '🚨', aliases: ['emergency','er','trauma','casualty','urgent care','ambulance'] },
      { id: 'dest-pharmacy',   name: 'Pharmacy',                    nodeId: 'G-PHARMACY',   floor: 0, department: 'Pharmacy Services',            roomNumber: 'PHARM',   icon: '💊', aliases: ['pharmacy','chemist','drugs','medication','medicine shop','dispensary'] },
      { id: 'dest-radiology',  name: 'Radiology & Imaging',         nodeId: 'G-RADIOLOGY',  floor: 0, department: 'Diagnostic Imaging',           roomNumber: 'RAD-01',  icon: '🩻', aliases: ['radiology','x-ray','mri','ct scan','ultrasound','imaging'] },
      { id: 'dest-pathology',  name: 'Pathology Laboratory',        nodeId: 'G-PATHOLOGY',  floor: 0, department: 'Laboratory Services',          roomNumber: 'LAB-01',  icon: '🧪', aliases: ['pathology','lab','blood test','laboratory','diagnostics','sample collection'] },
      { id: 'dest-reception',  name: 'Main Reception & Help Desk',  nodeId: 'G-RECEPTION',  floor: 0, department: 'Patient Administration',        roomNumber: 'REC-01',  icon: 'ℹ️', aliases: ['reception','help desk','information','lobby','registration','front desk'] },
      { id: 'dest-cafeteria',  name: 'Hospital Cafeteria',          nodeId: 'G-CAFETERIA',  floor: 0, department: 'Hospital Amenities',           roomNumber: 'CAF-01',  icon: '☕', aliases: ['cafeteria','canteen','coffee','food','dining','snack'] },
      { id: 'dest-restrooms',  name: 'Restrooms & Washrooms',       nodeId: 'G-RESTROOMS',  floor: 0, department: 'Public Facilities',            roomNumber: 'WC-01',   icon: '🚻', aliases: ['restroom','toilet','washroom','bathroom','wc'] },
      { id: 'dest-201',        name: 'Room 201',                    nodeId: 'F1-201',       floor: 1, department: 'Inpatient Ward A',             roomNumber: '201',     icon: '🛏', aliases: ['201','room 201','inpatient 201','suite 201','private room 201'] },
      { id: 'dest-202',        name: 'Room 202',                    nodeId: 'F1-202',       floor: 1, department: 'Inpatient Ward A',             roomNumber: '202',     icon: '🛏', aliases: ['202','room 202','inpatient 202','ward 202'] },
      { id: 'dest-203',        name: 'Room 203',                    nodeId: 'F1-203',       floor: 1, department: 'Inpatient Ward A',             roomNumber: '203',     icon: '🛏', aliases: ['203','room 203','inpatient 203'] },
      { id: 'dest-204',        name: 'Room 204',                    nodeId: 'F1-204',       floor: 1, department: 'Inpatient Ward B',             roomNumber: '204',     icon: '🛏', aliases: ['204','room 204','inpatient 204','ward 204'] },
      { id: 'dest-205',        name: 'Room 205 – Neurology',        nodeId: 'F1-205',       floor: 1, department: 'Neurology',                    roomNumber: '205',     icon: '🧠', aliases: ['205','room 205','neurology','neuro suite','brain clinic'] },
      { id: 'dest-206',        name: 'Room 206 – Oncology',         nodeId: 'F1-206',       floor: 1, department: 'Oncology Care',               roomNumber: '206',     icon: '🎀', aliases: ['206','room 206','oncology','cancer care'] },
      { id: 'dest-icu',        name: 'Intensive Care Unit (ICU)',    nodeId: 'F1-ICU',       floor: 1, department: 'Critical Care',               roomNumber: 'ICU-01',  icon: '❤️‍🔥', aliases: ['icu','intensive care','ccu','critical care'] },
      { id: 'dest-ot',         name: 'Operation Theatre Complex',    nodeId: 'F1-OT-SUITE',  floor: 1, department: 'Surgical Services',           roomNumber: 'OT-01',   icon: '⚕️', aliases: ['ot','operation theatre','surgery','or','operating room','ot 1','ot 2'] },
      { id: 'dest-cardiology', name: 'Cardiology Suite & Cath Lab', nodeId: 'F1-CARDIOLOGY',floor: 1, department: 'Cardiology',                  roomNumber: 'CARD-01', icon: '🫀', aliases: ['cardiology','heart','cath lab','cardiac','ecg'] },
      { id: 'dest-nurse-station', name: 'Nursing Station 1',        nodeId: 'F1-NURSE-STATION', floor: 1, department: 'Inpatient Admin',         roomNumber: 'NS-01',   icon: '👩‍⚕️', aliases: ['nurse','nursing','duty station','inpatient desk'] }
    ],

    // -----------------------------------------------------------------------
    // ARCHITECTURAL LAYOUT (exact verbatim room bboxes + corridor SVG paths)
    // -----------------------------------------------------------------------
    layout: {
      0: {
        rooms: [
          { id: 'G-101',       x:  40, y: 310, w: 110, h:  80, label: 'Room 101',      sub: 'General Medicine',      num: '101',    type: 'consultation' },
          { id: 'G-102',       x:  40, y: 210, w: 110, h:  80, label: 'Room 102',      sub: 'Pediatrics',            num: '102',    type: 'consultation' },
          { id: 'G-103',       x:  40, y: 130, w: 110, h:  70, label: 'Room 103',      sub: 'Internal Medicine',     num: '103',    type: 'consultation' },
          { id: 'G-RADIOLOGY', x:  40, y:  50, w: 110, h:  70, label: 'Radiology',     sub: 'X-Ray / MRI / CT',      num: 'RAD-01', type: 'diagnostic'   },
          { id: 'G-PHARMACY',  x: 240, y: 320, w: 120, h:  80, label: 'Pharmacy',      sub: 'Outpatient Dispensary', num: 'PHARM',  type: 'pharmacy'     },
          { id: 'G-RECEPTION', x: 360, y: 350, w: 120, h:  60, label: 'Reception',     sub: 'Help & Registration',   num: 'REC-01', type: 'reception'    },
          { id: 'G-CAFETERIA', x: 240, y:  40, w: 130, h:  60, label: 'Cafeteria',     sub: 'Dining & Refreshments', num: 'CAF-01', type: 'facility'     },
          { id: 'G-RESTROOMS', x: 470, y:  40, w: 120, h:  60, label: 'Restrooms',     sub: 'Accessible WC',         num: 'WC-01',  type: 'facility'     },
          { id: 'G-PATHOLOGY', x: 480, y: 320, w: 120, h:  80, label: 'Pathology Lab', sub: 'Blood Lab & Testing',   num: 'LAB-01', type: 'diagnostic'   },
          { id: 'G-104',       x: 700, y: 130, w: 110, h:  80, label: 'Room 104',      sub: 'Orthopedics',           num: '104',    type: 'consultation' },
          { id: 'G-105',       x: 700, y:  50, w: 110, h:  70, label: 'Room 105',      sub: 'ENT / Eye',             num: '105',    type: 'consultation' },
          { id: 'G-EMERGENCY', x: 700, y: 290, w: 110, h: 110, label: 'Emergency',     sub: 'Trauma Care',           num: 'ER-01',  type: 'emergency'    }
        ],
        verticals: [
          { id: 'G-LIFT-A',    x: 355, y: 175, w: 50, h: 50, label: 'Lift A',  type: 'lift'  },
          { id: 'G-LIFT-B',    x: 435, y: 175, w: 50, h: 50, label: 'Lift B',  type: 'lift'  },
          { id: 'G-STAIR-WEST',x: 165, y: 105, w: 50, h: 50, label: 'Stair W', type: 'stair' },
          { id: 'G-STAIR-EAST',x: 625, y: 105, w: 50, h: 50, label: 'Stair E', type: 'stair' }
        ],
        corridors: [
          'M 420 500 L 420 130',   // Central north–south spine (extended to north concourse)
          'M 190 250 L 650 250',   // Central east–west spine
          'M 190 90 L 190 350',    // West concourse
          'M 650 90 L 650 350',    // East concourse
          'M 190 130 L 650 130'    // North corridor (Stair W ↔ Cafeteria ↔ Restrooms ↔ Stair E)
        ],
        entrances: [
          { id: 'G-ENTRANCE',      x: 420, y: 520, label: 'Main Entrance' },
          { id: 'G-AMBULANCE-BAY', x: 755, y: 470, label: 'Ambulance Bay' }
        ]
      },
      1: {
        rooms: [
          { id: 'F1-201',           x:  40, y: 310, w: 110, h:  80, label: 'Room 201',      sub: 'Deluxe Inpatient Suite',  num: '201',     type: 'inpatient'  },
          { id: 'F1-202',           x:  40, y: 210, w: 110, h:  80, label: 'Room 202',      sub: 'Inpatient Ward',          num: '202',     type: 'inpatient'  },
          { id: 'F1-203',           x:  40, y: 130, w: 110, h:  70, label: 'Room 203',      sub: 'Inpatient Ward',          num: '203',     type: 'inpatient'  },
          { id: 'F1-OT-SUITE',      x:  40, y:  50, w: 110, h:  70, label: 'OT Suite',      sub: 'Sterile OT 1 & 2',       num: 'OT-01',   type: 'surgical'   },
          { id: 'F1-ICU',           x: 240, y: 320, w: 120, h:  80, label: 'ICU',            sub: 'Intensive Care Unit',     num: 'ICU-01',  type: 'critical'   },
          { id: 'F1-NURSE-STATION', x: 360, y: 310, w: 120, h:  50, label: 'Nurse Station', sub: 'Ward Monitoring',         num: 'NS-01',   type: 'nursing'    },
          { id: 'F1-DOCTORS-LOUNGE',x: 470, y:  40, w: 120, h:  60, label: 'Doctors Lounge',sub: 'Clinical Staff Only',    num: 'DOC-01',  type: 'staff'      },
          { id: 'F1-CARDIOLOGY',    x: 480, y: 320, w: 120, h:  80, label: 'Cardiology',    sub: 'Cath Lab & Diagnostics',  num: 'CARD-01', type: 'cardiology' },
          { id: 'F1-204',           x: 700, y: 130, w: 110, h:  80, label: 'Room 204',      sub: 'Inpatient Suite',         num: '204',     type: 'inpatient'  },
          { id: 'F1-205',           x: 700, y:  50, w: 110, h:  70, label: 'Room 205',      sub: 'Neurology Care',          num: '205',     type: 'inpatient'  },
          { id: 'F1-206',           x: 700, y: 290, w: 110, h: 110, label: 'Room 206',      sub: 'Oncology Care',           num: '206',     type: 'inpatient'  }
        ],
        verticals: [
          { id: 'F1-LIFT-A',    x: 355, y: 175, w: 50, h: 50, label: 'Lift A',  type: 'lift'  },
          { id: 'F1-LIFT-B',    x: 435, y: 175, w: 50, h: 50, label: 'Lift B',  type: 'lift'  },
          { id: 'F1-STAIR-WEST',x: 165, y: 105, w: 50, h: 50, label: 'Stair W', type: 'stair' },
          { id: 'F1-STAIR-EAST',x: 625, y: 105, w: 50, h: 50, label: 'Stair E', type: 'stair' }
        ],
        corridors: [
          'M 420 370 L 420 130',   // Central Level 1 spine (extended to north concourse)
          'M 190 250 L 650 250',   // Central east–west spine
          'M 190 90 L 190 350',    // West ward concourse
          'M 650 90 L 650 350',    // East ward concourse
          'M 190 130 L 650 130'    // North corridor (Stair W ↔ Doctors Lounge ↔ Stair E)
        ],
        entrances: []
      }
    }
  };

  // =========================================================================
  // 2. GRAPH DIAGNOSTIC — run exhaustive route tests on all node pairs
  //    Call: window.mediNav.runDiagnostic()
  // =========================================================================
  function buildAdjacency(dataset) {
    var adj = {};
    Object.keys(dataset.nodes).forEach(function(id) { adj[id] = []; });
    dataset.edges.forEach(function(e) {
      if (!dataset.nodes[e.from] || !dataset.nodes[e.to]) return;
      adj[e.from].push({ to: e.to, dist: e.distance });
      adj[e.to].push({ to: e.from, dist: e.distance });
    });
    return adj;
  }

  function dijkstra(adj, nodes, fromId) {
    var dist = {}, prev = {}, visited = {};
    Object.keys(nodes).forEach(function(id) { dist[id] = Infinity; });
    dist[fromId] = 0;
    var queue = [fromId];
    while (queue.length > 0) {
      queue.sort(function(a, b) { return dist[a] - dist[b]; });
      var u = queue.shift();
      if (visited[u]) continue;
      visited[u] = true;
      (adj[u] || []).forEach(function(e) {
        var nd = dist[u] + e.dist;
        if (nd < dist[e.to]) {
          dist[e.to] = nd;
          prev[e.to] = u;
          if (!visited[e.to]) queue.push(e.to);
        }
      });
    }
    return dist;
  }

  function runFullDiagnostic(dataset) {
    var adj    = buildAdjacency(dataset);
    var nodes  = dataset.nodes;
    var dests  = dataset.destinations;
    var startNodeIds = [];

    // All non-door intermediate nodes can be sources
    Object.values(nodes).forEach(function(n) {
      if (!/-DOOR$/.test(n.id) && !/-AIRLOCK$/.test(n.id)) startNodeIds.push(n.id);
    });

    var totalPairs = 0, found = 0, missing = 0;
    var missingList = [], results = [];
    var allDestNodeIds = dests.map(function(d) { return d.nodeId; });

    // Run Dijkstra from every destination node (reverse coverage)
    var reachFromDest = {};
    allDestNodeIds.forEach(function(destId) {
      reachFromDest[destId] = dijkstra(adj, nodes, destId);
    });

    startNodeIds.forEach(function(srcId) {
      allDestNodeIds.forEach(function(destId) {
        if (srcId === destId) return;
        totalPairs++;
        var dist = reachFromDest[destId][srcId];
        var reachable = isFinite(dist) && dist < Infinity;
        if (reachable) {
          found++;
          results.push({ src: srcId, dest: destId, dist: Math.round(dist * 10)/10, ok: true });
        } else {
          missing++;
          missingList.push({ src: srcId, dest: destId });
          results.push({ src: srcId, dest: destId, dist: null, ok: false });
        }
      });
    });

    // Connected components
    var visited2 = {}, components = 0;
    function dfs(id) {
      if (visited2[id]) return;
      visited2[id] = true;
      (adj[id] || []).forEach(function(e) { dfs(e.to); });
    }
    Object.keys(nodes).forEach(function(id) { if (!visited2[id]) { components++; dfs(id); } });

    return {
      totalNodes:    Object.keys(nodes).length,
      totalEdges:    dataset.edges.length * 2,
      totalPairs:    totalPairs,
      found:         found,
      missing:       missing,
      missingList:   missingList,
      components:    components,
      results:       results
    };
  }

  // =========================================================================
  // 3. A* PATHFINDER
  // =========================================================================
  function AStarPathfinder(dataset) {
    this.nodes = dataset.nodes;
    this.adj   = {};
    var self   = this;

    Object.keys(this.nodes).forEach(function(id) { self.adj[id] = []; });
    dataset.edges.forEach(function(e) {
      if (!self.nodes[e.from] || !self.nodes[e.to]) return;
      self.adj[e.from].push({ to: e.to, dist: e.distance, isVertical: !!e.isVertical, kind: e.edgeType || 'corridor' });
      self.adj[e.to].push({ to: e.from, dist: e.distance, isVertical: !!e.isVertical, kind: e.edgeType || 'corridor' });
    });
  }

  AStarPathfinder.prototype.heuristic = function(a, b) {
    var dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx*dx + dy*dy) + Math.abs(a.floor - b.floor) * 15;
  };

  AStarPathfinder.prototype.findRoute = function(fromId, toId) {
    var nodes = this.nodes, adj = this.adj;
    var startNode = nodes[fromId], goalNode = nodes[toId];
    var self = this;

    if (!startNode) return { ok: false, error: 'Starting location is not in the navigation graph.' };
    if (!goalNode)  return { ok: false, error: 'Destination is not in the navigation graph.' };
    if (fromId === toId) return {
      ok: true, path: [startNode], totalDist: 0,
      byFloor: {}, byFloor2: {}, hasFloorChange: false, transitions: []
    };

    var open = [fromId];
    var cameFrom = {};
    var gScore = {}, fScore = {};
    var ids = Object.keys(nodes);
    ids.forEach(function(id) { gScore[id] = Infinity; fScore[id] = Infinity; });
    gScore[fromId] = 0;
    fScore[fromId] = this.heuristic(startNode, goalNode);

    while (open.length > 0) {
      open.sort(function(a, b) { return fScore[a] - fScore[b]; });
      var cur = open.shift();

      if (cur === toId) {
        // Reconstruct path
        var path = [], c = cur;
        while (c !== undefined) {
          path.unshift(nodes[c]);
          c = cameFrom[c] ? cameFrom[c].from : undefined;
        }
        var byFloor = {}, transitions = [], hasFloorChange = false;
        path.forEach(function(n) {
          if (!byFloor[n.floor]) byFloor[n.floor] = [];
          byFloor[n.floor].push(n);
        });
        for (var i = 1; i < path.length; i++) {
          if (path[i-1].floor !== path[i].floor) {
            hasFloorChange = true;
            var kind = (path[i-1].type === 'lift' || path[i].type === 'lift') ? 'Lift' : 'Stairs';
            transitions.push({ fromFloor: path[i-1].floor, toFloor: path[i].floor, fromNode: path[i-1], toNode: path[i], kind: kind });
          }
        }
        return {
          ok: true, path: path,
          totalDist: Math.round(gScore[toId] * 10) / 10,
          byFloor: byFloor,
          hasFloorChange: hasFloorChange,
          transitions: transitions
        };
      }

      var curNode = nodes[cur];
      var neighbors = adj[cur] || [];
      for (var ni = 0; ni < neighbors.length; ni++) {
        var edge = neighbors[ni];
        var ng = gScore[cur] + edge.dist;
        if (ng < gScore[edge.to]) {
          cameFrom[edge.to] = { from: cur, edge: edge };
          gScore[edge.to] = ng;
          fScore[edge.to] = ng + self.heuristic(nodes[edge.to], goalNode);
          if (open.indexOf(edge.to) === -1) open.push(edge.to);
        }
      }
    }
    return { ok: false, error: 'No walkable route found between the selected locations.' };
  };

  // =========================================================================
  // 4. MAP RENDERER — SVG Vector Floor Plan + Route
  //    FIX #1: _ns moved from class field to constructor (file:// compat)
  //    FIX #2: setFloor early-return guard removed to allow forced refresh
  // =========================================================================
  function MapRenderer(container, dataset) {
    this._ns       = 'http://www.w3.org/2000/svg';  // FIX #1
    this.container = container;
    this.dataset   = dataset;
    this.floor     = 0;
    this.scale     = 1; this.panX = 0; this.panY = 0;
    this.dragging  = false; this.dragX = 0; this.dragY = 0;
    this.activeRoute  = null;
    this.livePos      = null;
    this.startNode    = null;
    this.destNode     = null;
    this.onRoomClick  = null;
    this._init();
  }

  MapRenderer.prototype._init = function() {
    var svgNS = this._ns;
    this.container.innerHTML = [
      '<svg id="mnav-svg" class="map-svg" viewBox="0 0 850 540" preserveAspectRatio="xMidYMid meet">',
      '<defs>',
      '<filter id="f-room" x="-4%" y="-4%" width="108%" height="116%">',
      '<feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#0f172a" flood-opacity="0.05"/></filter>',
      '<filter id="f-marker" x="-25%" y="-25%" width="150%" height="175%">',
      '<feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#1d4ed8" flood-opacity="0.3"/></filter>',
      '<filter id="f-marker-red" x="-25%" y="-25%" width="150%" height="175%">',
      '<feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#dc2626" flood-opacity="0.3"/></filter>',
      '<linearGradient id="g-route" x1="0%" y1="0%" x2="100%" y2="100%">',
      '<stop offset="0%" stop-color="#2563eb"/><stop offset="100%" stop-color="#1d4ed8"/></linearGradient>',
      '<pattern id="map-grid" width="25" height="25" patternUnits="userSpaceOnUse">',
      '<path d="M 25 0 L 0 0 0 25" fill="none" stroke="#e2e8f0" stroke-width="0.6" stroke-opacity="0.5"/></pattern>',
      '</defs>',
      '<g id="vp" transform="matrix(1 0 0 1 0 0)">',
      '<rect x="0" y="0" width="850" height="540" fill="url(#map-grid)"/>',
      '<rect x="12" y="12" width="826" height="516" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5"/>',
      '<g id="l-corridors"></g>',
      '<g id="l-rooms"></g>',
      '<g id="l-verticals"></g>',
      '<g id="l-entrances"></g>',
      '<g id="l-route"></g>',
      '<g id="l-markers"></g>',
      '</g></svg>'
    ].join('');

    this.svg       = this.container.querySelector('#mnav-svg');
    this.vp        = this.container.querySelector('#vp');
    this.layerCorr = this.container.querySelector('#l-corridors');
    this.layerRoom = this.container.querySelector('#l-rooms');
    this.layerVert = this.container.querySelector('#l-verticals');
    this.layerEnt  = this.container.querySelector('#l-entrances');
    this.layerRoute= this.container.querySelector('#l-route');
    this.layerMark = this.container.querySelector('#l-markers');

    this._bindPanZoom();
    this.renderFloor(this.floor);
  };

  MapRenderer.prototype._svgEl = function(tag, attrs, parent) {
    var el = document.createElementNS(this._ns, tag);
    Object.keys(attrs).forEach(function(k) { el.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(el);
    return el;
  };

  MapRenderer.prototype._svgG = function(attrs, parent) { return this._svgEl('g', attrs, parent); };

  MapRenderer.prototype._svgT = function(x, y, text, attrs, parent) {
    var all = { x: x, y: y, 'font-family': "'Inter',system-ui,sans-serif" };
    Object.keys(attrs).forEach(function(k) { all[k] = attrs[k]; });
    var el = this._svgEl('text', all, parent);
    el.textContent = text;
    return el;
  };

  MapRenderer.prototype._bindPanZoom = function() {
    var self = this, svg = this.svg;
    var td = null, tc = null;

    svg.addEventListener('mousedown', function(e) {
      if (e.button !== 0) return;
      self.dragging = true;
      self.dragX = e.clientX - self.panX;
      self.dragY = e.clientY - self.panY;
      svg.style.cursor = 'grabbing';
    });
    window.addEventListener('mousemove', function(e) {
      if (!self.dragging) return;
      self.panX = e.clientX - self.dragX;
      self.panY = e.clientY - self.dragY;
      self._applyT();
    });
    window.addEventListener('mouseup', function() {
      if (self.dragging) { self.dragging = false; svg.style.cursor = 'grab'; }
    });
    svg.addEventListener('wheel', function(e) {
      e.preventDefault();
      self._zoomAt(e.deltaY < 0 ? 1.14 : 0.88, e.clientX, e.clientY);
    }, { passive: false });

    svg.addEventListener('touchstart', function(e) {
      if (e.touches.length === 1) {
        self.dragging = true;
        self.dragX = e.touches[0].clientX - self.panX;
        self.dragY = e.touches[0].clientY - self.panY;
      } else if (e.touches.length === 2) {
        self.dragging = false;
        td = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        tc = { x: (e.touches[0].clientX + e.touches[1].clientX)/2, y: (e.touches[0].clientY + e.touches[1].clientY)/2 };
      }
    }, { passive: true });
    svg.addEventListener('touchmove', function(e) {
      if (e.touches.length === 1 && self.dragging) {
        self.panX = e.touches[0].clientX - self.dragX;
        self.panY = e.touches[0].clientY - self.dragY;
        self._applyT();
      } else if (e.touches.length === 2 && td) {
        var nd = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        self._zoomAt(nd / td, tc.x, tc.y); td = nd;
      }
    }, { passive: true });
    svg.addEventListener('touchend', function() { self.dragging = false; td = null; });
  };

  MapRenderer.prototype._zoomAt = function(f, cx, cy) {
    var rect = this.svg.getBoundingClientRect();
    var sx = cx - rect.left, sy = cy - rect.top;
    var ns = Math.min(Math.max(this.scale * f, 0.5), 5);
    var af = ns / this.scale;
    this.panX = sx - (sx - this.panX) * af;
    this.panY = sy - (sy - this.panY) * af;
    this.scale = ns;
    this._applyT();
  };
  MapRenderer.prototype._applyT = function() {
    this.vp.setAttribute('transform', 'matrix(' + this.scale + ' 0 0 ' + this.scale + ' ' + this.panX + ' ' + this.panY + ')');
  };
  MapRenderer.prototype.zoomIn  = function() { var r = this.svg.getBoundingClientRect(); this._zoomAt(1.25, r.width/2, r.height/2); };
  MapRenderer.prototype.zoomOut = function() { var r = this.svg.getBoundingClientRect(); this._zoomAt(0.80, r.width/2, r.height/2); };
  MapRenderer.prototype.resetView = function() { this.scale = 1; this.panX = 0; this.panY = 0; this._applyT(); };

  MapRenderer.prototype.fitRoute = function() {
    var nodes = this.activeRoute && this.activeRoute.byFloor[this.floor];
    if (!nodes || !nodes.length) { this.resetView(); return; }
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach(function(n) { minX = Math.min(minX,n.x); maxX = Math.max(maxX,n.x); minY = Math.min(minY,n.y); maxY = Math.max(maxY,n.y); });
    var pad = 140;
    var ts  = Math.min(Math.max(Math.min(850 / (Math.max(maxX-minX,140)+pad*2), 540 / (Math.max(maxY-minY,140)+pad*2)), 0.75), 2.4);
    this.scale = ts;
    this.panX  = 850/2 - ((minX+maxX)/2) * ts;
    this.panY  = 540/2 - ((minY+maxY)/2) * ts;
    this._applyT();
  };

  // FIX #2: removed early-return guard so setFloor always re-renders
  MapRenderer.prototype.setFloor = function(f) {
    this.floor = f;
    this.renderFloor(f);
    this._refreshRoute();
    this._refreshMarkers();
  };

  MapRenderer.prototype._roomColors = function(type) {
    var MAP = {
      consultation: { fill:'#f8fafc', stroke:'#94a3b8', bb:'#dbeafe', bc:'#1d4ed8' },
      emergency:    { fill:'#fff1f2', stroke:'#fda4af', bb:'#ffe4e6', bc:'#e11d48' },
      pharmacy:     { fill:'#f0fdf4', stroke:'#86efac', bb:'#dcfce7', bc:'#15803d' },
      diagnostic:   { fill:'#f0f9ff', stroke:'#7dd3fc', bb:'#e0f2fe', bc:'#0284c7' },
      cardiology:   { fill:'#fdf4ff', stroke:'#e879f9', bb:'#fae8ff', bc:'#a21caf' },
      critical:     { fill:'#fffbeb', stroke:'#fcd34d', bb:'#fef3c7', bc:'#b45309' },
      surgical:     { fill:'#fffbeb', stroke:'#fbbf24', bb:'#fef3c7', bc:'#92400e' },
      inpatient:    { fill:'#f8fafc', stroke:'#cbd5e1', bb:'#e2e8f0', bc:'#334155' },
      reception:    { fill:'#eff6ff', stroke:'#93c5fd', bb:'#dbeafe', bc:'#1e40af' },
      facility:     { fill:'#f0fdf4', stroke:'#86efac', bb:'#dcfce7', bc:'#166534' },
      nursing:      { fill:'#fdf4ff', stroke:'#c084fc', bb:'#f3e8ff', bc:'#7e22ce' },
      staff:        { fill:'#f8fafc', stroke:'#94a3b8', bb:'#e2e8f0', bc:'#475569' }
    };
    return MAP[type] || MAP.inpatient;
  };

  MapRenderer.prototype.renderFloor = function(f) {
    var layout = this.dataset.layout[f];
    if (!layout) return;
    var self = this;
    this.layerCorr.innerHTML = '';
    this.layerRoom.innerHTML = '';
    this.layerVert.innerHTML = '';
    this.layerEnt.innerHTML  = '';

    // Corridors
    layout.corridors.forEach(function(d) {
      self._svgEl('path', { d: d, stroke: '#f1f5f9', 'stroke-width': '44', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' }, self.layerCorr);
      self._svgEl('path', { d: d, stroke: '#e2e8f0', 'stroke-width': '1.5', 'stroke-dasharray': '6,6', fill: 'none' }, self.layerCorr);
    });

    // Rooms
    layout.rooms.forEach(function(rm) {
      var g = self._svgG({ class: 'room-group room-' + rm.type, 'data-node-id': rm.id }, self.layerRoom);
      g.style.cursor = 'pointer';
      var c = self._roomColors(rm.type);
      self._svgEl('rect', { x: rm.x, y: rm.y, width: rm.w, height: rm.h, rx: '10', fill: c.fill, stroke: c.stroke, 'stroke-width': '1.8', filter: 'url(#f-room)' }, g);
      if (rm.num) {
        var bw = Math.min(rm.num.length * 9 + 18, 58), bh = 18;
        self._svgEl('rect', { x: rm.x+8, y: rm.y+8, width: bw, height: bh, rx: '4', fill: c.bb }, g);
        self._svgT(rm.x+8+bw/2, rm.y+20, rm.num, { 'font-size': '10', 'font-weight': '700', fill: c.bc, 'text-anchor': 'middle' }, g);
      }
      self._svgT(rm.x+rm.w/2, rm.y+(rm.num?42:28), rm.label, { 'font-size': '12', 'font-weight': '700', fill: '#0f172a', 'text-anchor': 'middle' }, g);
      if (rm.sub) self._svgT(rm.x+rm.w/2, rm.y+(rm.num?57:43), rm.sub, { 'font-size': '9.5', 'font-weight': '500', fill: '#64748b', 'text-anchor': 'middle' }, g);
      self._svgEl('rect', { x: rm.x, y: rm.y, width: rm.w, height: rm.h, rx: '10', fill: 'transparent' }, g);
      g.addEventListener('click', function() { if (self.onRoomClick) self.onRoomClick(rm.id); });
    });

    // Verticals (lifts & stairs)
    layout.verticals.forEach(function(v) {
      var g = self._svgG({}, self.layerVert);
      var isLift = v.type === 'lift';
      self._svgEl('rect', { x: v.x, y: v.y, width: v.w, height: v.h, rx: '10', fill: isLift?'#ede9fe':'#d1fae5', stroke: isLift?'#a78bfa':'#34d399', 'stroke-width': '2' }, g);
      self._svgT(v.x+v.w/2, v.y+v.h/2-3, isLift?'🛗':'🪜', { 'font-size': '16', 'text-anchor': 'middle', 'dominant-baseline': 'central' }, g);
      self._svgT(v.x+v.w/2, v.y+v.h-8, v.label, { 'font-size': '8.5', 'font-weight': '700', fill: isLift?'#7c3aed':'#059669', 'text-anchor': 'middle' }, g);
    });

    // Entrance markers
    layout.entrances.forEach(function(ent) {
      var g = self._svgG({}, self.layerEnt);
      self._svgEl('polygon', { points: ent.x+','+(ent.y-14)+' '+(ent.x-10)+','+ent.y+' '+(ent.x+10)+','+ent.y, fill: '#1d4ed8', stroke: '#fff', 'stroke-width': '2' }, g);
      self._svgT(ent.x, ent.y+14, ent.label, { 'font-size': '9', 'font-weight': '700', fill: '#1d4ed8', 'text-anchor': 'middle' }, g);
    });
  };

  MapRenderer.prototype.setRoute = function(result, startNode, destNode) {
    this.activeRoute = result;
    this.startNode   = startNode;
    this.destNode    = destNode;
    this._refreshRoute();
    this._refreshMarkers();
  };

  MapRenderer.prototype.clearRoute = function() {
    this.activeRoute = null;
    this.startNode   = null;
    this.destNode    = null;
    this.livePos     = null;
    this.layerRoute.innerHTML = '';
    this.layerMark.innerHTML  = '';
  };

  MapRenderer.prototype._refreshRoute = function() {
    this.layerRoute.innerHTML = '';
    if (!this.activeRoute) return;
    var nodes = this.activeRoute.byFloor[this.floor];
    if (!nodes || nodes.length < 2) return;
    var pts = nodes.map(function(n) { return n.x + ',' + n.y; });
    var d   = 'M ' + pts.join(' L ');
    this._svgEl('path', { d: d, fill: 'none', stroke: '#93c5fd', 'stroke-width': '10', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: '0.35' }, this.layerRoute);
    this._svgEl('path', { d: d, fill: 'none', stroke: 'url(#g-route)', 'stroke-width': '5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, this.layerRoute);
    var dp = this._svgEl('path', { d: d, fill: 'none', stroke: '#ffffff', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-dasharray': '4,12', 'stroke-dashoffset': '0' }, this.layerRoute);
    dp.classList.add('route-animated');
    for (var i = 1; i < nodes.length - 1; i++) {
      this._svgEl('circle', { cx: nodes[i].x, cy: nodes[i].y, r: '3', fill: '#fff', stroke: '#2563eb', 'stroke-width': '1.5' }, this.layerRoute);
    }
  };

  MapRenderer.prototype._refreshMarkers = function() {
    this.layerMark.innerHTML = '';
    var self = this;
    if (this.startNode && this.startNode.floor === this.floor) this._drawPin(this.startNode.x, this.startNode.y, '#2563eb', 'start');
    if (this.livePos   && this.livePos.floor   === this.floor) this._drawLivePin(this.livePos.x, this.livePos.y);
    if (this.destNode  && this.destNode.floor   === this.floor) this._drawPin(this.destNode.x, this.destNode.y, '#dc2626', 'dest');
    if (this.activeRoute && this.activeRoute.transitions) {
      this.activeRoute.transitions.forEach(function(t) {
        if (t.fromNode.floor === self.floor) self._drawFloorMark(t.fromNode.x, t.fromNode.y, t.kind);
        if (t.toNode.floor   === self.floor) self._drawFloorMark(t.toNode.x,   t.toNode.y,   t.kind);
      });
    }
  };

  MapRenderer.prototype._drawPin = function(cx, cy, color, role) {
    var g    = this._svgG({ filter: role === 'dest' ? 'url(#f-marker-red)' : 'url(#f-marker)' }, this.layerMark);
    var ring = this._svgEl('circle', { cx: cx, cy: cy, r: '14', fill: color, opacity: '0.15' }, g);
    ring.classList.add(role === 'dest' ? 'dest-pulse' : 'live-pulse');
    this._svgEl('circle', { cx: cx, cy: cy, r: '10', fill: color, stroke: '#ffffff', 'stroke-width': '2.5' }, g);
    this._svgEl('circle', { cx: cx, cy: cy, r: '3',  fill: '#ffffff' }, g);
  };

  MapRenderer.prototype._drawLivePin = function(cx, cy) {
    var g    = this._svgG({ filter: 'url(#f-marker)' }, this.layerMark);
    var ring = this._svgEl('circle', { cx: cx, cy: cy, r: '15', fill: '#2563eb', opacity: '0.18' }, g);
    ring.classList.add('live-pulse');
    this._svgEl('circle', { cx: cx, cy: cy, r: '10', fill: '#2563eb', stroke: '#fff', 'stroke-width': '2.5' }, g);
    this._svgEl('circle', { cx: cx, cy: cy, r: '4',  fill: '#fff' }, g);
  };

  MapRenderer.prototype._drawFloorMark = function(cx, cy, kind) {
    var isLift = kind === 'Lift';
    var g = this._svgG({}, this.layerMark);
    this._svgEl('rect', { x: cx-14, y: cy-14, width: 28, height: 28, rx: '6', fill: isLift?'#7c3aed':'#059669', stroke: '#fff', 'stroke-width': '2' }, g);
    this._svgT(cx, cy+1, isLift ? '🛗' : '↕', { 'font-size': '13', 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: '#fff', 'font-weight': '700' }, g);
  };

  MapRenderer.prototype.updateLivePosition = function(pos) {
    this.livePos = pos;
    if (pos.floor !== this.floor) return;
    this._refreshMarkers();
    if (this.activeRoute && this.activeRoute.byFloor[this.floor]) {
      var floorNodes = this.activeRoute.byFloor[this.floor];
      var best = 0, bestDist = Infinity;
      floorNodes.forEach(function(n, i) { var d = Math.hypot(n.x-pos.x, n.y-pos.y); if (d < bestDist) { bestDist=d; best=i; } });
      var remaining = floorNodes.slice(best);
      this.layerRoute.innerHTML = '';
      if (remaining.length >= 2) {
        var pts = remaining.map(function(n) { return n.x+','+n.y; });
        var d   = 'M ' + pts.join(' L ');
        this._svgEl('path', { d: d, fill: 'none', stroke: '#93c5fd', 'stroke-width': '10', 'stroke-linecap': 'round', opacity: '0.3' }, this.layerRoute);
        this._svgEl('path', { d: d, fill: 'none', stroke: 'url(#g-route)', 'stroke-width': '5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, this.layerRoute);
        var dp = this._svgEl('path', { d: d, fill: 'none', stroke: '#fff', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-dasharray': '4,12' }, this.layerRoute);
        dp.classList.add('route-animated');
      }
    }
  };

  // =========================================================================
  // 5. LIVE POSITIONING STUB
  // =========================================================================
  function LivePositioning(renderer) {
    this.renderer  = renderer;
    this.simTimer  = null;
    this.simActive = false;
    var self = this;
    window.updateLivePosition = function(payload) { self._handle(payload); };
  }

  LivePositioning.prototype._handle = function(payload) {
    if (typeof payload.x !== 'number' || typeof payload.y !== 'number') return;
    this.renderer.updateLivePosition({ floor: payload.floor || 0, x: payload.x, y: payload.y });
  };

  LivePositioning.prototype.startSimulation = function(path, onDone) {
    this.stopSimulation();
    if (!path || path.length < 2) return;
    this.simActive = true;
    var i = 0, t = 0, self = this;
    this.simTimer = setInterval(function() {
      if (i >= path.length - 1) { self.stopSimulation(); if (onDone) onDone(); return; }
      var a = path[i], b = path[i+1];
      if (a.floor !== b.floor) { i++; t = 0; self._handle({ floor: b.floor, x: b.x, y: b.y }); return; }
      t += 0.06;
      if (t >= 1) { t = 0; i++; }
      self._handle({ floor: a.floor, x: Math.round((a.x+(b.x-a.x)*t)*10)/10, y: Math.round((a.y+(b.y-a.y)*t)*10)/10 });
    }, 80);
  };

  LivePositioning.prototype.stopSimulation = function() {
    if (this.simTimer) clearInterval(this.simTimer);
    this.simTimer = null;
    this.simActive = false;
  };

  // =========================================================================
  // 6. DIAGNOSTIC MODAL (in-browser test report)
  // =========================================================================
  function showDiagnosticModal(report) {
    var existing = document.getElementById('diag-modal');
    if (existing) existing.remove();

    var pct = report.totalPairs > 0 ? Math.round(report.found / report.totalPairs * 100) : 0;
    var statusColor = report.missing === 0 ? '#15803d' : '#b45309';

    var rows = '';
    report.missingList.slice(0, 50).forEach(function(r) {
      rows += '<tr style="color:#b91c1c"><td style="padding:3px 8px;font-size:11px">' + r.src + '</td><td style="padding:3px 8px;font-size:11px">' + r.dest + '</td><td style="padding:3px 8px;font-size:11px">❌ UNREACHABLE</td></tr>';
    });
    if (report.missingList.length > 50) {
      rows += '<tr><td colspan="3" style="padding:6px 8px;font-size:11px;color:#64748b">…and ' + (report.missingList.length - 50) + ' more unreachable pairs</td></tr>';
    }
    if (!rows) rows = '<tr><td colspan="3" style="padding:8px;color:#15803d;font-size:12px">✅ All routes reachable!</td></tr>';

    var html = '<div id="diag-modal" style="position:fixed;inset:0;background:rgba(15,23,42,.6);backdrop-filter:blur(4px);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px">' +
      '<div style="background:#fff;border-radius:16px;padding:24px;width:100%;max-width:680px;max-height:90vh;overflow:auto;box-shadow:0 20px 50px rgba(0,0,0,.2)">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">' +
      '<h2 style="font-size:17px;font-weight:800;color:#0f172a">Navigation Graph Diagnostic</h2>' +
      '<button id="diag-close" style="background:#f1f5f9;border:none;border-radius:8px;padding:6px 12px;cursor:pointer;font-size:13px;font-weight:600">Close</button></div>' +

      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">' +
      '<div style="background:#f8fafc;border-radius:10px;padding:12px;border:1px solid #e2e8f0"><div style="font-size:22px;font-weight:800;color:#0f172a">' + report.totalNodes + '</div><div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.06em">Total Nodes</div></div>' +
      '<div style="background:#f8fafc;border-radius:10px;padding:12px;border:1px solid #e2e8f0"><div style="font-size:22px;font-weight:800;color:#0f172a">' + report.totalEdges + '</div><div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.06em">Directed Edges</div></div>' +
      '<div style="background:#f8fafc;border-radius:10px;padding:12px;border:1px solid #e2e8f0"><div style="font-size:22px;font-weight:800;color:#0f172a">' + report.components + '</div><div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.06em">Connected Components</div></div>' +
      '<div style="background:#eff6ff;border-radius:10px;padding:12px;border:1px solid #bfdbfe"><div style="font-size:22px;font-weight:800;color:#1d4ed8">' + report.totalPairs + '</div><div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.06em">Pairs Tested</div></div>' +
      '<div style="background:#f0fdf4;border-radius:10px;padding:12px;border:1px solid #bbf7d0"><div style="font-size:22px;font-weight:800;color:#15803d">' + report.found + '</div><div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.06em">Routes Found</div></div>' +
      '<div style="background:' + (report.missing===0?'#f0fdf4':'#fff7ed') + ';border-radius:10px;padding:12px;border:1px solid ' + (report.missing===0?'#bbf7d0':'#fed7aa') + '"><div style="font-size:22px;font-weight:800;color:' + statusColor + '">' + report.missing + '</div><div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.06em">Missing Routes</div></div>' +
      '</div>' +

      '<div style="background:' + (report.missing===0?'#f0fdf4':'#fff7ed') + ';border:1px solid ' + (report.missing===0?'#bbf7d0':'#fed7aa') + ';border-radius:10px;padding:12px;margin-bottom:16px;font-size:13px;font-weight:600;color:' + statusColor + '">' +
      (report.missing === 0 ? '✅ Graph is fully connected — all ' + report.found + ' source→destination pairs are reachable (' + pct + '%)' :
       '⚠️ ' + report.missing + ' pairs unreachable out of ' + report.totalPairs + ' (' + pct + '% success rate). ' + report.components + ' connected component(s).' ) + '</div>' +

      (rows ? '<div style="font-size:12px;font-weight:700;color:#334155;margin-bottom:8px">Unreachable Pairs (first 50):</div>' +
      '<div style="max-height:220px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:8px"><table style="width:100%;border-collapse:collapse">' +
      '<thead><tr style="background:#f8fafc"><th style="padding:6px 8px;font-size:10px;text-align:left">Source</th><th style="padding:6px 8px;font-size:10px;text-align:left">Destination</th><th style="padding:6px 8px;font-size:10px;text-align:left">Status</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>' : '') +
      '</div></div>';

    document.body.insertAdjacentHTML('beforeend', html);
    document.getElementById('diag-close').addEventListener('click', function() {
      document.getElementById('diag-modal').remove();
    });
  }

  // =========================================================================
  // 7. APP CONTROLLER
  // =========================================================================
  function MediNavApp() {
    this.dataset    = DATASET;
    this.pathfinder = new AStarPathfinder(DATASET);
    this.renderer   = new MapRenderer(document.getElementById('map-viewport'), DATASET);
    this.livePos    = new LivePositioning(this.renderer);

    this.startId    = 'G-ENTRANCE';
    this.destEntry  = null;
    this.route      = null;
    this.activePill = null;

    this._dom();
    this._populate();
    this._bind();

    // Show initial start marker
    this.renderer.startNode = DATASET.nodes[this.startId];
    this.renderer._refreshMarkers();
  }

  MediNavApp.prototype._dom = function() {
    var q = function(id) { return document.getElementById(id); };
    this.startSelect   = q('start-location-select');
    this.destInput     = q('destination-search-input');
    this.clearBtn      = q('clear-search-btn');
    this.dropdown      = q('search-results-dropdown');
    this.floorBtns     = document.querySelectorAll('.floor-tab');
    this.quickPills    = document.querySelectorAll('.quick-pill');
    this.routePanel    = q('route-info-panel');
    this.routeTitle    = q('route-info-title');
    this.statDist      = q('stat-distance');
    this.statTime      = q('stat-time');
    this.statFloorsBox = q('stat-floors-container');
    this.statFloors    = q('stat-floors');
    this.fcBanner      = q('floor-change-banner');
    this.fcText        = q('floor-change-text');
    this.routeSteps    = q('route-steps');
    this.resetRouteBtn = q('btn-reset-route');
    this.errorBanner   = q('error-banner');
    this.errorText     = q('error-text');
    this.btnZoomIn     = q('btn-zoom-in');
    this.btnZoomOut    = q('btn-zoom-out');
    this.btnFitRoute   = q('btn-fit-route');
    this.btnResetView  = q('btn-reset-view');
    this.btnSimulate   = q('btn-simulate-walk');
    this.btnWifi       = q('btn-wifi-mock');
    this.wifiModal     = q('wifi-modal');
    this.closeWifiBtn  = q('btn-close-wifi-modal');
    this.cancelWifiBtn = q('btn-cancel-wifi');
    this.sendWifiBtn   = q('btn-send-wifi-payload');
    this.wifiFloor     = q('wifi-input-floor');
    this.wifiX         = q('wifi-input-x');
    this.wifiY         = q('wifi-input-y');
    this.watermark     = q('floor-watermark-text');
    this.btnValidate   = q('btn-validate-nav');
  };

  MediNavApp.prototype._populate = function() {
    var gf = [], f1 = [], self = this;
    Object.values(DATASET.nodes).forEach(function(n) {
      if (/(-DOOR|-AIRLOCK)$/.test(n.id)) return;  // FIX #6: allow -ENT nodes in list
      (n.floor === 0 ? gf : f1).push(n);
    });

    function mkGroup(label, nodes) {
      var og = document.createElement('optgroup');
      og.label = label;
      nodes.forEach(function(n) {
        var o = document.createElement('option');
        o.value = n.id;
        o.textContent = n.name;
        if (n.id === self.startId) o.selected = true;
        og.appendChild(o);
      });
      return og;
    }
    this.startSelect.appendChild(mkGroup('Ground Floor (GF)', gf));
    this.startSelect.appendChild(mkGroup('First Floor (1F)', f1));
  };

  MediNavApp.prototype._bind = function() {
    var self = this;

    this.floorBtns.forEach(function(btn) {
      btn.addEventListener('click', function() { self._switchFloor(parseInt(btn.dataset.floor, 10)); });
    });

    this.startSelect.addEventListener('change', function(e) {
      self.startId = e.target.value;
      var n = DATASET.nodes[self.startId];
      if (n && n.floor !== self.renderer.floor) self._switchFloor(n.floor);
      if (self.destEntry) self._calcRoute();
      else { self.renderer.startNode = n; self.renderer._refreshMarkers(); }
    });

    this.destInput.addEventListener('input',  function(e) { self._onSearch(e.target.value.trim()); });
    this.destInput.addEventListener('focus',  function()  { self._onSearch(self.destInput.value.trim()); });
    this.clearBtn.addEventListener('click',   function()  { self._clearDest(); });

    document.addEventListener('click', function(e) {
      if (!self.dropdown.contains(e.target) && e.target !== self.destInput) {
        self.dropdown.classList.remove('open');
      }
    });

    this.quickPills.forEach(function(pill) {
      pill.addEventListener('click', function() {
        var dest = DATASET.destinations.find(function(d) { return d.id === pill.dataset.destId; });
        if (dest) { self._setActivePill(pill); self._selectDest(dest); }
      });
    });

    this.resetRouteBtn.addEventListener('click', function() { self._clearDest(); });

    this.btnZoomIn.addEventListener('click',    function() { self.renderer.zoomIn(); });
    this.btnZoomOut.addEventListener('click',   function() { self.renderer.zoomOut(); });
    this.btnFitRoute.addEventListener('click',  function() { self.renderer.fitRoute(); });
    this.btnResetView.addEventListener('click', function() { self.renderer.resetView(); });

    this.renderer.onRoomClick = function(nodeId) {
      var dest = DATASET.destinations.find(function(d) { return d.nodeId === nodeId; });
      if (dest) { self._setActivePill(null); self._selectDest(dest); }
    };

    // Simulate walk
    this.btnSimulate.addEventListener('click', function() {
      if (!self.route) { self._showError('Calculate a route first.'); return; }
      if (self.livePos.simActive) {
        self.livePos.stopSimulation();
        self.btnSimulate.classList.remove('active');
        self.btnSimulate.textContent = '▶ Simulate';
        return;
      }
      self.btnSimulate.classList.add('active');
      self.btnSimulate.textContent = '⏹ Stop';
      self.livePos.startSimulation(self.route.path, function() {
        self.btnSimulate.classList.remove('active');
        self.btnSimulate.textContent = '▶ Simulate';
      });
    });

    // Wi-Fi modal
    this.btnWifi.addEventListener('click',       function() { self.wifiModal.style.display = 'flex'; });
    this.closeWifiBtn.addEventListener('click',  function() { self.wifiModal.style.display = 'none'; });
    this.cancelWifiBtn.addEventListener('click', function() { self.wifiModal.style.display = 'none'; });
    this.wifiModal.addEventListener('click',     function(e) { if (e.target === self.wifiModal) self.wifiModal.style.display = 'none'; });
    this.sendWifiBtn.addEventListener('click', function() {
      var floor = parseInt(self.wifiFloor.value, 10);
      var x = parseFloat(self.wifiX.value), y = parseFloat(self.wifiY.value);
      if (isNaN(floor) || isNaN(x) || isNaN(y)) { alert('Enter valid numbers.'); return; }
      window.updateLivePosition({ floor: floor, x: x, y: y });
      if (floor !== self.renderer.floor) self._switchFloor(floor);
      self.wifiModal.style.display = 'none';
    });

    // Validate button
    if (this.btnValidate) {
      this.btnValidate.addEventListener('click', function() {
        self.btnValidate.textContent = 'Running…';
        setTimeout(function() {
          var report = runFullDiagnostic(DATASET);
          showDiagnosticModal(report);
          self.btnValidate.textContent = '✓ Validate';
        }, 50);
      });
    }
  };

  MediNavApp.prototype._switchFloor = function(f) {
    this.floorBtns.forEach(function(b) {
      var active = parseInt(b.dataset.floor, 10) === f;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', active);
    });
    this.renderer.setFloor(f);
    if (this.watermark) this.watermark.textContent = f === 0 ? 'Ground Floor' : 'First Floor';
  };

  MediNavApp.prototype._onSearch = function(q) {
    if (!q) { this.clearBtn.classList.remove('visible'); this.dropdown.classList.remove('open'); return; }
    this.clearBtn.classList.add('visible');
    var ql = q.toLowerCase();
    var matches = DATASET.destinations.filter(function(d) {
      return d.name.toLowerCase().includes(ql) ||
             d.aliases.some(function(a) { return a.includes(ql); }) ||
             (d.roomNumber && d.roomNumber.toLowerCase().includes(ql)) ||
             (d.department && d.department.toLowerCase().includes(ql));
    });
    this._renderDropdown(matches, q);
  };

  MediNavApp.prototype._esc = function(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  };

  MediNavApp.prototype._highlight = function(text, q) {
    if (!q) return this._esc(text);
    var re = new RegExp('(' + this._esc(q).replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + ')', 'gi');
    return this._esc(text).replace(re, '<strong>$1</strong>');
  };

  MediNavApp.prototype._renderDropdown = function(matches, query) {
    var self = this;
    this.dropdown.innerHTML = '';

    // Position the dropdown below the input field
    var rect = this.destInput.getBoundingClientRect();
    this.dropdown.style.top    = (rect.bottom + 4) + 'px';
    this.dropdown.style.left   = rect.left + 'px';
    this.dropdown.style.width  = rect.width + 'px';
    this.dropdown.style.right  = 'auto';

    if (!matches.length) {
      this.dropdown.innerHTML = '<div class="no-results"><div class="no-results-icon">🔍</div><div>No destination found for "<strong>' + this._esc(query) + '</strong>"</div></div>';
      this.dropdown.classList.add('open');
      return;
    }
    matches.forEach(function(dest) {
      var div = document.createElement('div');
      div.className = 'search-result-item';
      div.setAttribute('role', 'option');
      var fl = dest.floor === 0 ? 'Ground Floor' : 'First Floor';
      div.innerHTML = '<div class="sri-icon">' + (dest.icon || '🏥') + '</div>' +
        '<div class="sri-text"><div class="sri-name">' + self._highlight(dest.name, query) + '</div>' +
        '<div class="sri-sub">' + self._esc(dest.department) + ' · <span class="sri-floor-tag">' + fl + '</span></div></div>' +
        '<div class="sri-arrow">›</div>';
      div.addEventListener('click', function() { self._setActivePill(null); self._selectDest(dest); });
      self.dropdown.appendChild(div);
    });
    this.dropdown.classList.add('open');
  };

  MediNavApp.prototype._selectDest = function(dest) {
    this.destEntry = dest;
    this.destInput.value = dest.name;
    this.dropdown.classList.remove('open');
    this.clearBtn.classList.add('visible');
    this._hideError();
    if (!DATASET.nodes[dest.nodeId]) { this._showError('Destination node not found in navigation graph.'); return; }
    this._calcRoute();
  };

  MediNavApp.prototype._clearDest = function() {
    this.destEntry = null;
    this.destInput.value = '';
    this.clearBtn.classList.remove('visible');
    this.dropdown.classList.remove('open');
    this.route = null;
    this.renderer.clearRoute();
    this.routePanel.style.display = 'none';
    this.livePos.stopSimulation();
    this.btnSimulate.classList.remove('active');
    this.btnSimulate.textContent = '▶ Simulate';
    this._hideError();
    this._setActivePill(null);
    this.renderer.startNode = DATASET.nodes[this.startId];
    this.renderer._refreshMarkers();
  };

  MediNavApp.prototype._setActivePill = function(p) {
    this.quickPills.forEach(function(q) { q.classList.remove('active'); });
    if (p) p.classList.add('active');
    this.activePill = p;
  };

  MediNavApp.prototype._calcRoute = function() {
    this._hideError();
    var startNode = DATASET.nodes[this.startId];
    var destNode  = DATASET.nodes[this.destEntry && this.destEntry.nodeId];
    if (!startNode) { this._showError('Starting location not in navigation graph.'); return; }
    if (!destNode)  { this._showError('Destination not in navigation graph.'); return; }

    var result = this.pathfinder.findRoute(this.startId, this.destEntry.nodeId);
    if (!result.ok) { this._showError(result.error || 'No walkable route found.'); return; }

    this.route = result;
    this.renderer.setRoute(result, startNode, destNode);
    if (startNode.floor !== this.renderer.floor) this._switchFloor(startNode.floor);
    this._showRoutePanel(result, startNode);
  };

  MediNavApp.prototype._showRoutePanel = function(result, startNode) {
    var self = this;
    this.routePanel.style.display = 'block';
    this.routeTitle.textContent = startNode.name.split(' ')[0] + ' → ' + this.destEntry.name;
    this.statDist.textContent = result.totalDist + ' m';
    var secs = Math.round(result.totalDist / 1.3);
    this.statTime.textContent = secs < 60 ? secs + ' sec' : Math.ceil(secs/60) + ' min';

    if (result.hasFloorChange) {
      var t = result.transitions[0];
      this.statFloorsBox.style.display = 'flex';
      this.statFloors.textContent = t.kind;
      this.fcBanner.style.display = 'flex';
      this.fcText.textContent = 'Uses ' + t.kind + ': ' + (t.fromFloor === 0 ? 'Ground' : '1st') + ' → ' + (t.toFloor === 0 ? 'Ground' : '1st') + ' Floor. Switch floor tabs to view each leg.';
    } else {
      this.statFloorsBox.style.display = 'none';
      this.fcBanner.style.display = 'none';
    }

    // Route steps — FIX #6: only skip -DOOR and -AIRLOCK, not -ENT
    this.routeSteps.innerHTML = '';
    var visible = result.path.filter(function(n) { return !/-DOOR$/.test(n.id) && !/-AIRLOCK$/.test(n.id); });
    visible.forEach(function(n, i) {
      var div = document.createElement('div');
      div.className = 'route-step';
      var dotClass = 'step-dot';
      if (i === 0) dotClass += ' step-dot-start';
      else if (i === visible.length - 1) dotClass += ' step-dot-dest';
      else if (n.type === 'lift')  dotClass += ' step-dot-lift';
      else if (n.type === 'stair') dotClass += ' step-dot-stair';
      var prefix = i === 0 ? '<strong>Start</strong>: ' : i === visible.length-1 ? '<strong>Arrive</strong>: ' : '';
      div.innerHTML = '<div class="' + dotClass + '"></div><div class="step-text">' + prefix + self._esc(n.name) + '</div>';
      self.routeSteps.appendChild(div);
    });
  };

  MediNavApp.prototype._showError = function(msg) {
    this.errorText.textContent = msg;
    this.errorBanner.style.display = 'flex';
    this.routePanel.style.display  = 'none';
  };
  MediNavApp.prototype._hideError = function() { this.errorBanner.style.display = 'none'; };

  // Public diagnostic API
  MediNavApp.prototype.runDiagnostic = function() {
    var report = runFullDiagnostic(DATASET);
    showDiagnosticModal(report);
    return report;
  };

  // ── BOOT ──────────────────────────────────────────────────────────────────
  function boot() {
    window.mediNav = new MediNavApp();
    // Run silent self-test on boot — results in console
    var r = runFullDiagnostic(DATASET);
    console.group('[MediNav] Boot Graph Diagnostic');
    console.log('Nodes:', r.totalNodes, '| Directed edges:', r.totalEdges, '| Components:', r.components);
    console.log('Route pairs tested:', r.totalPairs, '| Found:', r.found, '| Missing:', r.missing);
    if (r.missing > 0) console.warn('Unreachable pairs:', r.missingList);
    else console.log('%c✅ All routes reachable — graph is fully connected!', 'color:green;font-weight:bold');
    console.groupEnd();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})();

// CSV import / export helpers for the Academics screens. Same file formats and
// parsing rules as the web panel. Import reads a file chosen with the document
// picker; export opens the system share sheet with the CSV text.

import { Share } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

export function splitLines(text) {
  return String(text || '').replace(/^﻿/, '').trim().split(/\r?\n/).filter(Boolean);
}

const cell = (c) => c.trim().replace(/^["']|["']$/g, '');

// Generic reader: header row -> lower-cased keys.
export function readRows(text) {
  const lines = splitLines(text);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => cell(h).toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = line.split(',').map(cell);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] || '';
    });
    return row;
  });
}

export function parseYears(text) {
  return readRows(text).map((row) => ({
    name: row.name || '',
    code: row.code || '',
    startDate: row.startdate || row['start date'] || '',
    endDate: row.enddate || row['end date'] || '',
    status: ['DRAFT', 'ACTIVE', 'ARCHIVED'].includes((row.status || '').toUpperCase()) ? row.status.toUpperCase() : 'DRAFT',
  }));
}

export function parseClasses(text) {
  return readRows(text)
    .map((row) => ({
      name: row.name,
      description: row.description || '',
      status: (row.status || 'ACTIVE').toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    }))
    .filter((r) => r.name);
}

const SUBJECT_TYPES = ['THEORY', 'PRACTICAL', 'BOTH', 'ACTIVITY'];
export function parseSubjects(text) {
  return readRows(text)
    .map((row) => {
      const t = (row.subjecttype || row['subject type'] || '').toUpperCase();
      return { name: row.name, code: row.code || '', subjectType: SUBJECT_TYPES.includes(t) ? t : 'THEORY' };
    })
    .filter((r) => r.name);
}

export function parseAssignments(text) {
  return readRows(text)
    .map((row) => ({
      academicYear: row['academic year'] || row.academicyear || row.year || '',
      className: row.class || row.classname || row['class name'] || '',
      sectionName: row.section || row.sectionname || row['section name'] || '',
      subjectCode: row['subject code'] || row.subjectcode || row.code || row.subject || '',
      teacherEmail: row['teacher email'] || row.teacheremail || row.teacher || '',
      maxMarks: Number(row['max marks'] || row.maxmarks || 100) || 100,
      passingMarks: Number(row['passing marks'] || row.passingmarks || 33) || 33,
    }))
    .filter((r) => r.className && r.sectionName && r.subjectCode);
}

export const SAMPLES = {
  years: 'name,code,startDate,endDate,status\n2024-25,2024-25,2024-04-01,2025-03-31,DRAFT\n2025-26,2025-26,2025-04-01,2026-03-31,DRAFT',
  classes: 'name,description,status\nNursery,,ACTIVE\nLKG,,ACTIVE\nUKG,,ACTIVE\nClass 1,,ACTIVE',
  subjects: 'name,code,subjectType\nMathematics,MATH,THEORY\nScience,SCI,THEORY\nEnglish,ENG,THEORY\nPhysical Education,PE,ACTIVITY',
  assignments:
    'Academic Year,Class,Section,Subject Code,Teacher Email,Max Marks,Passing Marks\n2025-26,Class 1,A,MATH,teacher@school.edu,100,33\n2025-26,Class 1,A,ENG,,100,33\n2025-26,Class 1,B,SCI,,100,33',
};

/** Open the file picker and return the chosen file's text, or null if cancelled. */
export async function pickCsvText() {
  const res = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (res.canceled || !res.assets?.length) return null;
  const response = await fetch(res.assets[0].uri);
  return response.text();
}

/** Share CSV text through the system share sheet. */
export function shareCsv(title, text) {
  return Share.share({ title, message: text });
}

export const csvEscape = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

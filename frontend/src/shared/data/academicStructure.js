export const SUBJECT_SETS = {
  primary: [],
  middle: [],
  secondary9: [],
  secondary10: [],
  seniorSecondary: [],
};

export const STREAMS = ['Science', 'Commerce', 'Arts'];

export const CLASSES = [];

export const CLASS_NAMES = [];

export const SECTIONS_BY_CLASS = {};

export const findClass = (name, section) =>
  CLASSES.find((c) => c.name === name && (!section || c.section === section));

export const getClassSectionLabel = (name, section) => (section ? `${name} ${section}` : name);

export const ACADEMIC_STRUCTURE = {
  CLASSES,
  SUBJECT_SETS,
  STREAMS,
  CLASS_NAMES,
  SECTIONS_BY_CLASS
};

import { findStudent } from './students';

export const MOCK_PARENTS = [];

export const findParent = (id) => MOCK_PARENTS.find((p) => p.id === id);
export const findParentByChildId = (studentId) => MOCK_PARENTS.find((p) => p.children.includes(studentId));

export const childrenOf = (parentId) => {
  const parent = findParent(parentId);
  if (!parent) return [];
  return (parent.children || []).map(findStudent).filter(Boolean);
};

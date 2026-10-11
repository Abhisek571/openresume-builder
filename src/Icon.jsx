// Small, shared outline icons; no icon font or network dependency.
const paths = {
  document: 'M6 3h8l4 4v14H6z M14 3v5h4 M9 12h6 M9 16h6',
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  edit: 'm4 16 12-12 4 4L8 20H4z M13 7l4 4',
  design: 'M4 4h16v16H4z M4 10h16 M10 10v10',
  search: 'M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14 M15 15l6 6',
  settings: 'M4 7h16 M4 17h16 M8 4v6 M16 14v6',
  download: 'M12 3v12 m-5-5 5 5 5-5 M4 16v5h16v-5',
  history: 'M3 11a9 9 0 1 1 3 8 M3 4v7h7 M12 7v6l4 2',
  plus: 'M12 5v14 M5 12h14',
  expand: 'M8 3H3v5 M16 3h5v5 M3 16v5h5 M21 16v5h-5',
  chevron: 'm6 14 6-6 6 6',
  back: 'm10 5-7 7 7 7 M3 12h18',
  check: 'm5 12 4 4L19 6',
  lock: 'M6 10h12v11H6z M8 10V6a4 4 0 0 1 8 0v4',
  person: 'M8 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0 M4 21v-3a8 8 0 0 1 16 0v3',
  briefcase: 'M3 7h18v14H3z M8 7V3h8v4 M3 12h18 M10 12v3h4v-3',
};
export default function Icon({ name = 'document', size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.document} /></svg>;
}

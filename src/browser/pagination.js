// Lay out already-rendered, escaped React DOM. No imported HTML is parsed.
// Screen and print both use these same explicit page fragments.
export function paginatePreview(source, target) {
  target.replaceChildren();
  let page, content, currentSection, sectionSource;
  let pageCount = 0;
  const newPage = () => {
    page = document.createElement('article');
    page.className = source.className;
    page.classList.add('resume-page');
    page.setAttribute('aria-label', `Resume page ${++pageCount}`);
    page.dataset.page = String(pageCount);
    content = document.createElement('div');
    content.className = 'page-content';
    page.append(content);
    target.append(page);
    currentSection = null;
  };
  newPage();
  const fits = () => {
    const style = getComputedStyle(page);
    const capacity = page.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    return content.offsetHeight <= capacity + 0.5;
  };
  const container = () => {
    if (!sectionSource) return content;
    if (!currentSection) {
      currentSection = sectionSource.cloneNode(false);
      const heading = sectionSource.querySelector(':scope > h3');
      if (heading) currentSection.append(heading.cloneNode(true));
      content.append(currentSection);
    }
    return currentSection;
  };
  const cleanup = () => {
    if (currentSection && currentSection.children.length <= (currentSection.querySelector('h3') ? 1 : 0)) {
      currentSection.remove();
      currentSection = null;
    }
  };
  const place = (original) => {
    if (page.classList.contains('oversize-page')) newPage();
    const node = original.cloneNode(true);
    container().append(node);
    if (fits()) return;
    node.remove();
    cleanup();
    // Try a fresh page before splitting an entry. Never leave a heading alone.
    if (content.children.length) newPage();
    container().append(node);
    if (fits()) return;
    node.remove();
    cleanup();
    const list = original.querySelector(':scope > ul');
    const children = [...original.children];
    if (list?.children.length > 1) {
      // An entry taller than a page is split at bullet boundaries. Subsequent
      // fragments retain the original list style but do not repeat job headers.
      for (const [index, bullet] of [...list.children].entries()) {
        const fragment = original.cloneNode(false);
        if (index === 0) for (const child of children) if (child !== list) fragment.append(child.cloneNode(true));
        const partialList = list.cloneNode(false);
        partialList.style.counterReset = `r-list-count ${index}`;
        partialList.append(bullet.cloneNode(true));
        fragment.append(partialList);
        place(fragment);
      }
    } else if (original.matches('ul, .r-skills') && children.length > 1) {
      for (const [index, child] of children.entries()) {
        const fragment = original.cloneNode(false);
        if (original.matches('ul')) fragment.style.counterReset = `r-list-count ${index}`;
        fragment.append(child.cloneNode(true));
        place(fragment);
      }
    } else {
      // A single very long paragraph/bullet cannot be kept together. Leave it
      // visible and allow native print fragmentation rather than losing text.
      container().append(node);
      page.classList.add('oversize-page');
    }
  };
  for (const child of source.children) {
    if (child.tagName !== 'SECTION') {
      sectionSource = null;
      currentSection = null;
      place(child);
      continue;
    }
    sectionSource = child;
    currentSection = null;
    const items = [...child.children].filter((node) => node.tagName !== 'H3');
    for (const item of items) place(item);
  }
  const pages = [...target.children];
  for (const [index, sheet] of pages.entries()) sheet.dataset.pageLabel = `${index + 1} / ${pages.length}`;
  return { pages: pages.length, oversized: pages.some((sheet) => sheet.classList.contains('oversize-page')) };
}

export function ref(name, root = document) {
  return root.querySelector(`[data-js-${name}]`);
}

export function refs(name, root = document) {
  return [...root.querySelectorAll(`[data-js-${name}]`)];
}

export function field(root, name) {
  return root.querySelector(`[data-js-field="${name}"]`);
}

export function cloneTemplate(name) {
  return ref(`template-${name}`).content.firstElementChild.cloneNode(true);
}

export function fillSelect(select, options) {
  select.replaceChildren(
    ...options.map(({ value, label }) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      return option;
    }),
  );
}

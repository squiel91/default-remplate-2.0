import { getTiendu } from "./tiendu-sdk";

const getTriggers = (): HTMLButtonElement[] =>
  Array.from(
    document.querySelectorAll<HTMLButtonElement>(
      "[data-header-search-trigger]",
    ),
  );

const setSearchButtonLoading = (
  button: HTMLButtonElement,
  loading: boolean,
): void => {
  for (const iconNode of button.querySelectorAll<HTMLElement>(
    "[data-search-button-icon]",
  )) {
    iconNode.hidden =
      iconNode.dataset.searchButtonIcon !== (loading ? "loader" : "search");
  }
};

export const initHeaderSearch = (): void => {
  const triggers = getTriggers();
  if (triggers.length === 0) return;

  for (const trigger of triggers) {
    if (trigger.dataset.bound === "true") continue;
    trigger.dataset.bound = "true";
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      const tiendu = getTiendu();
      trigger.disabled = true;
      setSearchButtonLoading(trigger, true);

      const resetTrigger = () => {
        setSearchButtonLoading(trigger, false);
        trigger.disabled = false;
      };

      void tiendu.search
        .open({
          query: trigger.dataset.headerSearchQuery || "",
        })
        .then(() => {
          resetTrigger();
        })
        .catch(() => {
          resetTrigger();
          window.alert("No se pudo abrir el buscador");
        });
    });
  }
};

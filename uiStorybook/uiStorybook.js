/*
 * Last Modified on Wed Nov 3 2022
 *   by Nick Demarest
 *
 *  Version 1.0
 */

import { api, LightningElement } from "lwc";
import storybookTemplate from "./uiStorybook.html";
import collapsedTemplate from "./collapsed.html";
import helpTemplate from "./help.html";
import { loadScript, loadStyle } from "lightning/platformResourceLoader";
import axeCore from "@salesforce/resourceUrl/AxeCoreJS";
const axeResource = axeCore + "/axe-core.min.js";

/* **** DO NOT MODIFY THIS COMPONENT **** */
export default class UiStorybook extends LightningElement {
  @api name;
  @api homeComponent = '__HELP__,Default';
  @api themeResource;
  @api themeClass;
  @api startCollapsed;

  // child
  @api component = "";
  @api variation = "";
  @api set props(val) {
    this._props = val;
    this.refresh();
  }
  get props() {
    return this._props || {};
  }

  // parent
  @api stories = {};
  myStories = []; // internal

  selected = {};
  tabs = ["Actions", "Accessibility", "Controls", "HTML"];
  activeTab = 2;
  events = [];
  myProps = [];

  get launchLabel() {
    return `Launch ${this.name}`;
  }

  fullScreen;
  connectedCallback() {
    this.fullScreen = !this.startCollapsed;
    if (this.component) return;
    if (this.homeComponent) {
      this.myStories = this.formatStories();
      if (this.themeResource) {
        this.loaded = false;
        loadStyle(this, this.themeResource).then(() => {
          this.loaded = true;
        });
      }
      const [key, variation] = this.homeComponent.split(",");
      if (!this.stories[key])
        throw new Error("story component not found: " + key);
      this.selected = { key, variation };
      const saved = localStorage.getItem("StorybookSelection:" + this.name);
      if (saved && this.stories[JSON.parse(saved).key])
        this.selected = JSON.parse(saved);
      this.helperSelect();
      // eslint-disable-next-line @lwc/lwc/no-async-operation
      setTimeout(() => {
        this.resetTabs();
      }, 500);
    }
  }

  render() {
    if (this.component) {
      // child
      const variationTemplate =
        this.storyComponent.variations[this.variation]?.__template;
      const defaultTemplate =
        this.storyComponent.variations.Default?.__template;
      return (
        variationTemplate || defaultTemplate || this.storyComponent.template
      );
    }
    return this.fullScreen ? storybookTemplate : collapsedTemplate;
  }

  formatStories() {
    let expanded = localStorage.getItem(
      "StorybookSelectionExpanded:" + this.name
    );
    expanded = expanded && JSON.parse(expanded);
    const groupings = new Set();
    return Object.keys(this.stories)
      .map((key) => {
        const variations = Object.keys(
          this.stories[key].variations || { Default: {} }
        );
        const onlyOne = variations.length === 1;
        const grouping = this.stories[key].grouping || "Components";
        return {
          key,
          expanded:
            onlyOne || (expanded && expanded.includes(key)) || !expanded,
          ...this.stories[key],
          grouping,
          onlyOne,
          variations: variations.map((title) => ({
            label: onlyOne ? this.stories[key].title : title,
            title,
            hidden: !!this.stories[key].hideDefault && title === 'Default',
            active: false
          }))
        };
      })
      .filter(story => !story.disabled)
      .sort(
        (story1, story2) =>
          story1.grouping.localeCompare(story2.grouping) ||
          (story1.order || 999) - (story2.order || 999) ||
          story1.title.localeCompare(story2.title)
      )
      .map((story) => {
        const firstInGrouping = !groupings.has(story.grouping);
        groupings.add(story.grouping);
        return {
          ...story,
          firstInGrouping
        };
      });
  }

  get formattedHTML() {
    if (this.storyComponent.variations[this.selected.variation]?.__HTML) {
      return this.storyComponent.variations[this.selected.variation].__HTML;
    }
    let html = `<${this.storyComponentSelector}`;
    this.myProps
      .filter((prop) => !prop.name.match(/^__/))
      .forEach((prop) => {
        const propName = prop.name.split("").reduce((final, nextChar) => {
          return (
            final +
            (nextChar.toUpperCase() === nextChar ? "-" : "") +
            nextChar.toLowerCase()
          );
        }, "");
        if (prop.type === "string" || prop.type === "number") {
          html += `\n    ${propName}="${prop.value}"`;
        } else if (prop.type === "boolean") {
          html += prop.value ? `\n    ${propName}` : "";
        } else if (prop.type === "object") {
          html += `\n    ${propName}={${prop.name}}`;
        }
      });
    const allEvents = new Set();
    this.events.forEach((e) => allEvents.add(e.type));
    allEvents.forEach((e) => {
      const cap = e[0].toUpperCase() + e.slice(1);
      html += `\n    on${e}={handle${cap}}`;
    });
    html += `>\n`;
    if (this.storyComponent.variations[this.selected.variation].__slotHTML) {
      html += `${
        this.storyComponent.variations[this.selected.variation].__slotHTML
      }\n`;
    }
    html += `</${this.storyComponentSelector}>`;
    return html;
  }

  get storyComponent() {
    const key = this.component || this.selected.key;
    if (key === "__HELP__") {
      return {
        name: "example",
        selector: "lightning-badge",
        template: helpTemplate,
        description: "Example description lorem ipsum...",
        helpText: {
          label:
            'You can see this property modify the lightning-badge component by scrolling down to "Additional Documentation" #Controls'
        },
        variations: { Default: { label: "Example control @api property" } }
      };
    }
    return { ...this.stories[key], name: key };
  }

  get otherData() {
    return (
      this.storyComponent.otherData ||
      {
        ...(this.storyComponent.variations[
          this.variation || this.selected.variation
        ] || [])
      }.__otherData ||
      {}
    );
  }

  get storyComponentSelector() {
    if (this.storyComponent && this.storyComponent.selector) {
      return this.storyComponent.selector;
    }
    const cmpName = this.component || this.selected.key;
    let selector = cmpName.match(/^lightning/) ? "" : "c-";
    cmpName.split("").forEach((char) => {
      if (char.toUpperCase() === char) selector += "-";
      selector += char.toLowerCase();
    });
    return selector;
  }

  get variationData() {
    const data = {
      ...(this.storyComponent.variations[
        this.variation || this.selected.variation
      ] || [])
    };
    delete data.__template;
    delete data.__HTML;
    delete data.__slotHTML;
    delete data.__otherData;
    return data;
  }

  get myDisplayedProps() {
    return this.myProps.filter((prop) => !prop.name.match(/^__/));
  }

  renderedCallback() {
    if (this.component) {
      this.refresh();
    } else {
      const eventsEl = this.template.querySelector(
        '.ui-storybook-tabs-button[data-idx="0"]'
      );
      if (eventsEl) {
        eventsEl.style.setProperty(
          "--eventcount",
          `'${this.events.length || ""}'`
        );
      }
    }
  }

  refresh() {
    const el = this.template.querySelector(this.storyComponentSelector);
    if (el) {
      el.dataset.sa11y = "active";
      for (let prop of this.props) {
        try {
          if (prop.name === "class") {
            el.classList.add(prop.value);
          } else {
            let value = prop.value;
            if (prop.isJson) value = JSON.parse(value);
            if (prop.isNumber) value = parseFloat(value, 10);
            el[prop.name] = value;
          }
        } catch (err) {
          // value not ready yet (user is typing?)
        }
      }
    }
  }

  loaded = true;
  handleSelect(evt) {
    const { key, variation } = evt.currentTarget.dataset;
    this.selected = { key, variation };
    localStorage.setItem(
      "StorybookSelection:" + this.name,
      JSON.stringify(this.selected)
    );
    this.loaded = false;
    // eslint-disable-next-line @lwc/lwc/no-async-operation
    setTimeout(() => {
      this.loaded = true;
    }, 30);
    this.helperSelect();
  }

  helperBuildProp(prop, data) {
    const newProp = {
      name: prop,
      value: data[prop],
      type: typeof data[prop],
      isCheckbox: typeof data[prop] === "boolean",
      isText: ["string", "object", "number"].includes(typeof data[prop]),
      isNumber: typeof data[prop] === "number",
      isJson: typeof data[prop] === "object",
      helpText:
        this.storyComponent.helpText && this.storyComponent.helpText[prop]
    };
    if (newProp.isJson) {
      newProp.value = JSON.stringify(newProp.value);
    }
    return newProp;
  }

  helperSelect() {
    this.myStories = this.myStories.map((story) => ({
      ...story,
      variations: story.variations.map((variation) => ({
        ...variation,
        active:
          story.key === this.selected.key &&
          variation.title === this.selected.variation
      }))
    }));
    const variationData = this.variationData;
    const props = new Set();
    Object.keys(variationData).forEach((prop) => props.add(prop));
    Object.values(this.storyComponent.variations).forEach((variation) => {
      Object.keys(variation).forEach((prop) => props.add(prop));
    });

    this.myProps = [];
    Object.keys(variationData).forEach((prop) => {
      this.myProps.push(this.helperBuildProp(prop, variationData));
      props.delete(prop);
    });
    this.myProps = this.myProps.sort((p1, p2) =>
      p1.name.localeCompare(p2.name)
    );
    Array.from(props)
      .sort((p1, p2) => p1.localeCompare(p2))
      .forEach((prop) => {
        const defaultData = this.storyComponent.variations.Default;
        if (defaultData && defaultData[prop] !== undefined) {
          this.myProps.push({
            ...this.helperBuildProp(prop, defaultData),
            isAdditional: true
          });
        }
      });
    this.events = [];
    this.violations = [];
    this.activeTab = 2;
    this.resetTabs();
  }

  handlePropChange(evt) {
    const inputType = evt.currentTarget.type;
    const propName = evt.currentTarget.dataset.name;
    const value = evt.currentTarget.value;
    this.myProps = this.myProps.map((prop) => {
      if (prop.name === propName) {
        if (prop.isJson) {
          try {
            JSON.parse(value);
            evt.currentTarget.setCustomValidity("");
          } catch (e) {
            evt.currentTarget.setCustomValidity("Must be valid JSON");
            return prop;
          }
        }
        prop.value = inputType === "toggle" ? evt.currentTarget.checked : value;
      }
      return { ...prop };
    });
  }

  _eventKey = 0;
  handleStorybookEvent(evt) {
    evt.stopPropagation();
    if (!this.component) {
      if (evt.detail === "__AXE__") {
        this.helperAccessibility();
      } else {
        this._eventKey++;
        const detail = JSON.stringify(evt.detail.superdetail);
        this.events = this.events.concat({
          key: this._eventKey,
          type: evt.detail.type,
          detail
        });
      }
    } else {
      this.dispatchEvent(
        new CustomEvent("storybookevent", {
          detail: { type: evt.type, superdetail: evt.detail }
        })
      );
    }
  }

  handleChangeTab(evt) {
    this.activeTab = parseInt(evt.currentTarget.dataset.idx, 10);
    this.resetTabs();
    if (this.activeTab === 1) this.helperAccessibility();
  }

  resetTabs() {
    const buttons = this.template.querySelectorAll(".ui-storybook-tabs-button");
    buttons.forEach((button, idx) =>
      button.classList.toggle("active-tab", this.activeTab === idx)
    );
    const tabs = this.template.querySelectorAll("[data-tab]");
    tabs.forEach((tab, idx) =>
      tab.classList.toggle("hidden", this.activeTab !== idx)
    );
  }

  storyActive;
  handleStoryActivate() {
    this.storyActive = !this.storyActive;
    if (this.storyActive) {
      this.dispatchEvent(
        new CustomEvent("storybookevent", { detail: "__AXE__" })
      );
    }
  }

  accessibiltyLoading;
  accessibilityProblem;
  violations = [];
  async helperAccessibility() {
    try {
      this.accessibiltyLoading = true;
      await loadScript(this, axeResource);
      const axeEl = this.template.querySelector("div.axe-spot");
      // eslint-disable-next-line no-undef
      const results = await axe.run(axeEl, {
        rules: {
          region: { enabled: false }
        }
      });
      this.violations = results.violations.map((violation) => ({
        ...violation,
        failure: violation.nodes[0].failureSummary,
        html: violation.nodes[0].html
      }));
    } catch (e) {
      console.error(e);
      this.accessibilityProblem = String(e);
    }
    this.accessibiltyLoading = false;
  }

  handleCopyHTML() {
    navigator.clipboard.writeText(this.formattedHTML);
  }

  drawerClosed;
  handleToggleDrawer() {
    this.drawerClosed = !this.drawerClosed;
  }

  hideList;
  handleToggleList() {
    this.hideList = !this.hideList;
  }

  hideSettings;
  handleToggleSettings() {
    this.hideSettings = !this.hideSettings;
  }

  handleToggleStory(evt) {
    const { key } = evt.currentTarget.dataset;
    this.myStories = this.myStories.map((story) => ({
      ...story,
      expanded: key === story.key ? !story.expanded : story.expanded
    }));
    const expanded = this.myStories
      .filter((story) => story.expanded)
      .map((story) => story.key);
    localStorage.setItem(
      "StorybookSelectionExpanded:" + this.name,
      JSON.stringify(expanded)
    );
  }

  handleToggleFullScreen() {
    this.fullScreen = !this.fullScreen;
  }

  handleToggleHelp() {
    this.selected = { key: "__HELP__", variation: "Default" };
    this.helperSelect();
  }
}

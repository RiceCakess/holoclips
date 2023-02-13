import { DaisyColorConfig } from "./daisy-utils/daisy-types";

export type Theme = { name: string; colors: DaisyColorConfig; dark: boolean };

const DEFAULT_THEME: Theme = {
  name: "default",
  colors: {
    "base-100": "#1f1f1f",
    primary: "#3b88d5",
    neutral: "#758799",
    secondary: "#F06292",
    accent: "#F03284",
    error: "#B00020",
    info: "#64B5F6",
    success: "#4CAF50",
    warning: "#FB8C00",
  },
  dark: true,
};

const expandColors = ["primary", "secondary", "accent"];
export function compileTheme(theme: Theme) {
  const colorset = { ...DEFAULT_THEME.colors, ...theme.colors };

  const output = {};
  return output;
  console.log("not impl");
  // convert to #hex
  /*
    for (const brand in colorset) {
        if (!colorset[brand].startsWith('#')) {
            output[brand] = colors.getPaletteColor(brand);
        } else {
            output[brand] = colorset[brand];
        }
    }


    // add darken and lighten for main branding colors
    for (const brand of expandColors) {
        output[`${brand}-darken-2`] = colors.lighten(colorset[brand], -30)
        output[`${brand}-darken-1`] = colors.lighten(colorset[brand], -10)
        output[`${brand}-lighten-1`] = colors.lighten(colorset[brand], 10)
        output[`${brand}-lighten-2`] = colors.lighten(colorset[brand], 30)
    }

    return output;
    */
}

export function setCompiledTheme(compiledColors: Record<string, string>) {
  console.log("not impl");
  /*
    for (const c in compiledColors) {
        setCssVar(c, compiledColors[c]);
    }
    */
}

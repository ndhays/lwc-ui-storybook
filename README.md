# LWC Storybook
A storybook component built in LWC to enhance custom LWC development.  

## Story Configuration
Storybook can be used as a place for development and testing, as well as a source of documentation and a library to demo your lightning web components.  
  
The advanced configuration gives you tools to customize your stories to best serve your purposes. Storybook automatically detects public property types and allows you to view different component variations, and change properties on the fly. For public properties that are objects and arrays, use valid JSON.

## Example Usage
See `exampleStorybook` for an example of a storybook that has one component `helloWorld`, with two variations: "Default" and "With Name".

## Stories
A story is a Javascript object with the following required properties:  
- template (HTML template that contains an instance of the component)
- title (a name for the component)
- variations (an object mapping a varitiation name, key, to an object of public properties and corresponding values)
  
**For more configuration details click the "?" in the side menu.**

## Advanced Storybook Properties
- themeClass (optionally provide a class to wrap the displayed story component)
- themeResource (optionally provide a theme url, ie. static resource)
- startCollapsed (optionally start the storybook in a collapsed state with a launch button)
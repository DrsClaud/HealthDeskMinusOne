# migrate-component

I have selected a DOM element in the browser OR selected a component in the "HealthDesk-Experimental" subfolder and given you a TypeScript structure. If I have NOT given you a TypeScript structure, please ask for it, as it's very important all components being imported have one.

The porting process goes as follows:

Find out to which component the element belongs to. I'll do my best to select the container div of the element I'm interested in. If you have a serious ambiguity on which component I'm interested in, ask me for clarification.

Use the typescript structure I have provided to create the new component in the main codebase.

I have a storybook server running on: "http://localhost:6006". Create a hyper minimal configuration for this ported component on the "stories" directory and open the new component in the storybook server

After that I might have some comments or tweaks to tell you about, or, I might just move on to other tasks.
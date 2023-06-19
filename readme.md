This is a Deno enabled version of https://github.com/tmountain/pico-8-typescript.

To install:
`git clone https://github.com/DevTheo/tspico8.git`
'deno install --allow-read --allow-write --unstable tspico.ts`

To create a new project simple do the following:
`tspico8 init -d <some-non-existent-folder>`
Then you can create a cartridge by doing the following: 
`tspico8 run -d <folder-with-files>`

Watching is disabled and I haven't really tried making too many changes to the configuration. This is a very early build (but it appears to be working with a lot less hassle like copying stuff around and setting things up so that `bin\tspico.js` is in the path).

There's also some interesting code in the tsc.ts that I will eventually spin out.. essentially this transpiles your TS code into a single (module-less) js file (for my version of jspicl to convert it to lua)

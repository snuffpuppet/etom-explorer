eTOM Explorer 
Build an 'eTOM explorer' application that allows visual exploration of TMForum GB921 etom process framework. 
This tool will be used as a learning tool and organisational tool to frame, inform and document impact analysis from an OSS replatforming project implementation where the BSS will remain unchanged. 

Read the GB921 reference file in the project root called GB921_Business_Process_Framework_Processes_Excel_v25.5.xlsx and use that as the reference for this project.

Requirements 
Interface:
Domains are visual frames for the UI with the associated level items represented as tiles. Tiles can be drilled into to get the next level of tiles down to the bottom. All associated detail should be accessible from or displayed on the tiles.

Labelling:
Tiles should fall into 3 broad categories. 
1. OSS specific - processes that relate to OSS only 
2. OSS / BSS related - processes that rely on both to work
3. BSS specific - e.g. party management, contract management 
4. Other - where they don’t fit into the above 3 with a reason as to why
Tye above labels should be represented visually by colours and a legend. 

Views:
- A view on customer and operational value streams showing which processes belong to which value stream. 
- A dynamic search box on all views that allows searching for text or finding related items by associated concept. e.g. 
- a chatbox that uses the LLM to search for processes and related groups of processes via a natural language interface. 
All searches should show the related hierarchy of anything found in a view that is consistent with the home page view. 
All views of the processes should use a consistent view framework to allow easy consumption of the processes and related hierarchy through spatial and visual cues.

Classification:
Bespoke classification and descoping should be allowed and persisted in plain files that can be committed to git, ideally using Md files. Consider obsidian as a visualisation tool. 

Actions:
Descoping is the recognition that a particular process or process level item is not needed. This will be used during the refinement process when examining if it is required in the new world. This should be associated with a reason. 
Tags with colours should be able to be configured allowing for level items to be tagged and optimally cascaded to children. 

Deployment:
This should all run inside a docker container and map the local directory in to store files. 
It will need access to Claude API using sonnet (configurable) for the chat window. 

Suggestions:
- suggest ways of working with this massive process framework to enable classifying what’s important for the project and mapping it into functions that are currently performed, new functions required and functions no longer required. 
- The eventual goal of the classification and scoping of these processes is to produce easily consumable requirements gathering documents (in confluence) that show the three types of processes (new, changing, no longer needed) and automation levels currently employed by staff


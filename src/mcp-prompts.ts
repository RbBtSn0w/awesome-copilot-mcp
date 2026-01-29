import { Prompt } from '@modelcontextprotocol/sdk/types.js';
import dedent from 'dedent';
import { logger } from './logger';

export interface PromptDefinition {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required?: boolean;
  }>;
}

export class MCPPrompts {
  private prompts: PromptDefinition[] = [
    {
      name: 'get_search_prompt',
      description: 'Provides an interactive prompt for searching awesome-copilot content',
      arguments: [
        {
          name: 'keyword',
          description: 'The keyword to search for',
          required: true
        }
      ]
    },

  ];

  getPrompts(): Prompt[] {
    return this.prompts.map(p => ({
      name: p.name,
      description: p.description,
      arguments: p.arguments || []
    }));
  }

  getSearchPromptContent(keyword: string): string {
    return dedent`
      Please search all the skills, instructions, prompts, agents, and collections that are related to the search keyword: \`${keyword}\`

      **IMPORTANT: Execute the search tool immediately. Do not ask for confirmation before searching.**

      Here's the process to follow:
      1. Use the \`awesome-copilot\` MCP server. Call the \`search\` tool NOW with query="${keyword}".
      3. Do NOT load any skills, instructions, prompts, or agents from the MCP server until the user asks to do so.
      4. Scan local skills, instructions, prompts, and agents markdown files (NOTE: Collections are NOT saved locally, they are index files).
         - Skills: \`.github/skills/<skill_name>/\` (folder, not individual files)
         - Instructions: \`.github/instructions/*.instructions.md\`
         - Prompts: \`.github/prompts/*.prompt.md\`
         - Agents: \`.github/agents/*.agent.md\`
      5. Compare existing skills, instructions, prompts, and agents with the search results.
      6. Provide a structured response in a table format.
         - For Skills: The "Name" column MUST be the skill folder name (e.g., 'dev-toolkit'), NOT 'SKILL.md'.
         - For Others: Use the full filename.
         - Example:

        | Exists | Type         | Name                          | Title         | Description   |
        |--------|--------------|-------------------------------|---------------|---------------|
        | ✅     | skills       | dev-toolkit                   | Dev Toolkit   | Description 1 |
        | ❌     | instructions | instruction1.instructions.md  | Instruction 1 | Description 1 |
        | ✅     | prompts      | prompt1.prompt.md             | Prompt 1      | Description 1 |
        | ❌     | agents       | agent1.agent.md               | Agent 1       | Description 1 |

        ✅ indicates that the item already exists in this repository, while ❌ indicates that it does not.

      7. If any item doesn't exist in the repository, ask which item the user wants to save.
      8. If the user wants to save it:
         a. Use the \`load\` tool to fetch the full content of the selected item by its name.
         b. Save the retrieved content in the appropriate directory with NO modification.
         c. For skills: Use \`load_skill_directory\` tool with the skill name.
            - This returns ALL files in the skill folder at once.
            - Save each file to \`.github/skills/<skill_name>/\` preserving the structure.
         d. For others: Save in corresponding directory with appropriate extension.
      9. **Collections Handling**: Collections are INDEX FILES that reference multiple resources.
         - Display any matching collections with their name, description, tags, and items list.
         - Collections themselves are NOT saved locally - they are for discovery only.
         - If user wants items FROM a collection, save those individual items (prompts, agents, etc.) instead.
      10. Do NOT automatically install or save any items. Wait for explicit user confirmation.
    `;
  }



  getPromptByName(name: string): PromptDefinition | undefined {
    return this.prompts.find(p => p.name === name);
  }

  validatePromptName(name: string): boolean {
    return this.getPromptByName(name) !== undefined;
  }
}

import { MCPPrompts } from '../src/mcp-prompts';

describe('MCPPrompts', () => {
  let prompts: MCPPrompts;

  beforeEach(() => {
    prompts = new MCPPrompts();
  });

  describe('getPrompts', () => {
    it('should return all available prompt definitions', () => {
      const allPrompts = prompts.getPrompts();
      expect(allPrompts).toHaveLength(1);
    });

    it('should include search prompt', () => {
      const allPrompts = prompts.getPrompts();
      const searchPrompt = allPrompts.find(p => p.name === 'get_search_prompt');
      expect(searchPrompt).toBeDefined();
    });

  });

  describe('getSearchPromptContent', () => {
    it('should return a prompt with keyword substitution', () => {
      const content = prompts.getSearchPromptContent('typescript');
      expect(content).toContain('typescript');
    });

    it('should include search tool guidance', () => {
      const content = prompts.getSearchPromptContent('test');
      expect(content).toContain('search');
      expect(content).toContain('.github/');
    });

    it('should handle empty string keyword', () => {
      const content = prompts.getSearchPromptContent('');
      expect(content.length).toBeGreaterThan(0);
    });

    it('should handle whitespace string keyword', () => {
      const content = prompts.getSearchPromptContent('   ');
      expect(content.length).toBeGreaterThan(0);
    });

    it('should handle special characters in keyword', () => {
      const content = prompts.getSearchPromptContent('@#$%^&*');
      expect(content).toContain('@#$%^&*');
    });

    it('should handle a very long string keyword', () => {
      const longKeyword = 'a'.repeat(1000);
      const content = prompts.getSearchPromptContent(longKeyword);
      expect(content).toContain(longKeyword);
    });

    it('should include multiple collection references', () => {
      const content = prompts.getSearchPromptContent('search');
      expect(content).toContain('collections');
      expect(content).toContain('instructions');
      expect(content).toContain('prompts');
    });

    it('should include user confirmation guidance', () => {
      const content = prompts.getSearchPromptContent('example');
      expect(content).toContain('NO modification');
    });

    it('should include step-by-step instructions', () => {
      const content = prompts.getSearchPromptContent('demo');
      expect(content).toContain('search');
      expect(content).toContain('load');
    });
  });



  describe('getPromptByName', () => {
    it('should find an existing prompt', () => {
      const prompt = prompts.getPromptByName('get_search_prompt');
      expect(prompt).toBeDefined();
      expect(prompt?.name).toBe('get_search_prompt');
    });

    it('should not find a non-existent prompt', () => {
      const prompt = prompts.getPromptByName('non-existent');
      expect(prompt).toBeUndefined();
    });

    it('should find all registered prompts', () => {
      const allPrompts = prompts.getPrompts();
      allPrompts.forEach(p => {
        const found = prompts.getPromptByName(p.name);
        expect(found).toBeDefined();
      });
    });
  });

  describe('validatePromptName', () => {
    it('should validate a valid prompt name', () => {
      const isValid = prompts.validatePromptName('get_search_prompt');
      expect(isValid).toBe(true);
    });

    it('should reject an invalid prompt name', () => {
      const isValid = prompts.validatePromptName('invalid-prompt');
      expect(isValid).toBe(false);
    });

    it('should validate all registered prompt names', () => {
      const allPrompts = prompts.getPrompts();
      allPrompts.forEach(p => {
        expect(prompts.validatePromptName(p.name)).toBe(true);
      });
    });
  });
});

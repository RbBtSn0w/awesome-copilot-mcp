# Contributing to Awesome Copilot MCP

Thank you for your interest in contributing to Awesome Copilot MCP! We welcome contributions from the community.

## Getting Started

1.  **Fork the repository** on GitHub.
2.  **Clone your fork** locally:
    ```bash
    git clone https://github.com/yourusername/awesome-copilot-mcp.git
    cd awesome-copilot-mcp
    ```
3.  **Install dependencies**:
    ```bash
    npm install
    ```

## Development Workflow

1.  **Create a branch** for your feature or bug fix:
    ```bash
    git checkout -b feature/my-new-feature
    ```
2.  **Make your changes**. Ensure your code follows the existing style and conventions.
3.  **Run tests** to ensure you haven't broken anything:
    ```bash
    npm test
    ```
4.  **Check code coverage**:
    ```bash
    npm run test:coverage
    ```
    We aim for >80% code coverage.
5.  **Build the project** to verify compilation:
    ```bash
    npm run build
    ```

## Pull Requests

1.  **Push your branch** to your fork:
    ```bash
    git push origin feature/my-new-feature
    ```
2.  **Open a Pull Request** against the `main` branch of the original repository.
3.  Provide a clear description of your changes and the problem they solve.

## Code Style

*   We use **TypeScript**.
*   We use **ESLint** for linting. Run `npm run lint` to check your code.
*   We use **Vitest** for testing.

## Reporting Issues

If you find a bug or have a feature request, please open an issue on GitHub. Provide as much detail as possible, including steps to reproduce the issue.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

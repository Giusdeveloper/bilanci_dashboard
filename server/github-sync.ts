import { getUncachableGitHubClient } from './github-client';
import type { Express } from 'express';

export function setupGitHubRoutes(app: Express) {
  // Get GitHub user info
  app.get('/api/github/user', async (req, res) => {
    try {
      const octokit = await getUncachableGitHubClient();
      const { data: user } = await octokit.rest.users.getAuthenticated();
      res.json({ 
        username: user.login,
        name: user.name,
        avatar: user.avatar_url 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create a new repository
  app.post('/api/github/create-repo', async (req, res) => {
    try {
      const { name, description, isPrivate } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: 'Repository name is required' });
      }

      const octokit = await getUncachableGitHubClient();
      
      // Create the repository
      const { data: repo } = await octokit.rest.repos.createForAuthenticatedUser({
        name,
        description: description || 'Awentia Bilanci - Financial Dashboard Application',
        private: isPrivate ?? false,
        auto_init: false
      });

      res.json({
        success: true,
        repoUrl: repo.html_url,
        cloneUrl: repo.clone_url,
        sshUrl: repo.ssh_url,
        gitUrl: repo.git_url
      });
    } catch (error: any) {
      if (error.status === 422) {
        res.status(422).json({ error: 'Repository already exists or name is invalid' });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  // List user repositories
  app.get('/api/github/repos', async (req, res) => {
    try {
      const octokit = await getUncachableGitHubClient();
      const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
        sort: 'updated',
        per_page: 30
      });

      res.json(repos.map(repo => ({
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        url: repo.html_url,
        cloneUrl: repo.clone_url,
        private: repo.private,
        updatedAt: repo.updated_at
      })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}

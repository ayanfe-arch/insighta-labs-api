#!/usr/bin/env node
const { program } = require('commander')

program
  .name('insighta')
  .description('Insighta Labs+ CLI')
  .version('1.0.0')

// Auth commands
const { loginCmd, logoutCmd, whoamiCmd } = require('../src/commands/auth')
program.command('login').description('Login with GitHub').action(loginCmd)
program.command('logout').description('Logout').action(logoutCmd)
program.command('whoami').description('Show current user').action(whoamiCmd)

// Profiles commands
const profilesCmd = program.command('profiles').description('Manage profiles')
const { listCmd, getCmd, searchCmd, createCmd, exportCmd } = require('../src/commands/profiles')

profilesCmd
  .command('list')
  .description('List profiles')
  .option('--gender <gender>')
  .option('--country <country>')
  .option('--age-group <ageGroup>')
  .option('--min-age <minAge>')
  .option('--max-age <maxAge>')
  .option('--sort-by <sortBy>')
  .option('--order <order>')
  .option('--page <page>')
  .option('--limit <limit>')
  .action(listCmd)

profilesCmd
  .command('get <id>')
  .description('Get a profile by ID')
  .action(getCmd)

profilesCmd
  .command('search <query>')
  .description('Search profiles')
  .action(searchCmd)

profilesCmd
  .command('create')
  .description('Create a profile (admin only)')
  .requiredOption('--name <name>')
  .action(createCmd)

profilesCmd
  .command('export')
  .description('Export profiles as CSV')
  .requiredOption('--format <format>')
  .option('--gender <gender>')
  .option('--country <country>')
  .action(exportCmd)

program.parse(process.argv)
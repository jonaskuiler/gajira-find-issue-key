const _ = require('lodash')
const Jira = require('./common/net/Jira')

const issueIdRegEx = /([a-zA-Z0-9]+-[0-9]+)/g

const eventTemplates = {
  branch: '{{event.ref}}',
  commits: "{{event.commits.map(c=>c.message).join(' ')}}",
}

module.exports = class {
  constructor ({ githubEvent, argv, config }) {
    this.Jira = new Jira({
      baseUrl: config.baseUrl,
      token: config.token,
      email: config.email,
    })

    this.config = config
    this.argv = argv
    this.githubEvent = githubEvent
  }

  async execute () {
    if (this.argv.string) {
      const foundIssue = await this.findIssueKeyIn(this.argv.string)

      if (foundIssue) return foundIssue
    }

    if (this.argv.from) {
      const template = eventTemplates[this.argv.from]

      if (template) {
        const searchStr = this.preprocessString(template)
        const foundIssue = await this.findIssueKeyIn(searchStr)

        if (foundIssue) return foundIssue
      }
    }
  }

  async findIssueKeyIn (searchStr) {
    const match = searchStr.match(issueIdRegEx)

    console.log(`Searching in string: \n ${searchStr}`)

    if (!match) {
      console.log(`String does not contain issueKeys`)

      return
    }

		const foundIssues = await Promise.all(match.flatMap(async (issueKey) => {
			const issue = await this.Jira.getIssue(issueKey)

			return issue ? [issue.key] : []
		}))


		return foundIssues
  }

  preprocessString (str) {
    _.templateSettings.interpolate = /{{([\s\S]+?)}}/g
    const tmpl = _.template(str)

    return tmpl({ event: this.githubEvent })
  }
}

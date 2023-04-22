const pug = require('pug');
const cheerio = require('cheerio');

function getStatementsFromConversationFile(filePath) {
  const conversationHtml = pug.renderFile(filePath, {
    getState: () => { return null; },
    setState: () => {}
  });

  return convertConversationHtmlToStatements(conversationHtml);
}

function convertConversationHtmlToStatements(conversationHtml) {
  const $ = cheerio.load(conversationHtml);
  return $('conversation>statements>statement')
    .toArray()
    .map(statement => {
      const statementEl = $(statement);

      return {
        id: statementEl.attr('id'),
        speech: statementEl.children('speech').html(),
        text: statementEl.children('text').text(),
      };
    });
}

module.exports = getStatementsFromConversationFile;

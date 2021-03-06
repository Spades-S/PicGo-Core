import PicGo from '../../core/PicGo'
import request from 'request-promise-native'
import { PluginConfig } from '../../utils/interfaces'

const postOptions = (fileName, options, data) => {
  const path = options.path || ''
  const { token, repo } = options
  return {
    method: 'PUT',
    url: `https://api.github.com/repos/${repo}/contents/${encodeURI(path)}${encodeURI(fileName)}`,
    headers: {
      Authorization: `token ${token}`,
      'User-Agent': 'PicGo'
    },
    body: data,
    json: true
  }
}

const handle = async (ctx: PicGo) => {
  const githubOptions = ctx.getConfig('picBed.github')
  if (!githubOptions) {
    throw new Error('Can\'t find github config')
  }
  try {
    const imgList = ctx.output
    for (let i in imgList) {
      const data = {
        message: 'Upload by PicGo',
        branch: githubOptions.branch,
        content: imgList[i].base64Image,
        path: githubOptions.path + encodeURI(imgList[i].fileName)
      }
      const postConfig = postOptions(imgList[i].fileName, githubOptions, data)
      const body = await request(postConfig)
      if (body) {
        delete imgList[i].base64Image
        if (githubOptions.customUrl) {
          imgList[i]['imgUrl'] = `${githubOptions.customUrl}/${githubOptions.path}${imgList[i].fileName}`
        } else {
          imgList[i]['imgUrl'] = body.content.download_url
        }
        imgList[i]['type'] = 'github'
      } else {
        throw new Error('Server error, please try again')
      }
    }
    return ctx
  } catch (err) {
    ctx.emit('notification', {
      title: '上传失败！',
      body: '服务端出错，请重试'
    })
    throw err
  }
}

const config = (ctx: PicGo): PluginConfig[] => {
  let userConfig = ctx.getConfig('picBed.github')
  if (!userConfig) {
    userConfig = {}
  }
  const config = [
    {
      name: 'repo',
      type: 'input',
      default: userConfig.repo || '',
      required: true
    },
    {
      name: 'branch',
      type: 'input',
      default: userConfig.branch || 'master',
      required: true
    },
    {
      name: 'token',
      type: 'input',
      default: userConfig.token || '',
      required: true
    },
    {
      name: 'path',
      type: 'input',
      default: userConfig.path || '',
      required: false
    },
    {
      name: 'customUrl',
      type: 'input',
      default: userConfig.customUrl || '',
      required: false
    }
  ]
  return config
}

const handleConfig = async (ctx: PicGo) => {
  const prompts = config(ctx)
  const answer = await ctx.cmd.inquirer.prompt(prompts)
  ctx.saveConfig({
    'picBed.github': answer
  })
}

export default {
  name: 'GitHub图床',
  handle,
  handleConfig,
  config
}

const _ = {
  remove: require('lodash/remove')
}

const assembleTree = (comment, comments) => {
  const parentId = comment.id || null
  comment.comments = {
    nodes:
      _.remove(comments, c => c.parentId === parentId)
      .map(c => assembleTree(c, comments))
  }
  return comment
}

const measureTree = comment => {
  const { comments } = comment
  const numChildren = comment.comments.nodes.reduce(
    (acc, value) => {
      return acc + measureTree(value)
    },
    0
  )
  comment.comments = {
    ...comments,
    totalCount: numChildren,
    pageInfo: {
      hasNextPage: false,
      endCursor: null
    }
  }
  return numChildren + 1
}

const cutTreeX = (comment, maxDepth) => {
  const { comments } = comment
  if (comment.depth === maxDepth) {
    comment.comments = {
      ...comments,
      nodes: [],
      pageInfo: {
        ...comments.pageInfo,
        hasNextPage: comments.totalCount > 0
      }
    }
  } else {
    comments.nodes.forEach(c => cutTreeX(c, maxDepth))
  }
  return comment
}

module.exports = {
  comments: async (discussion, args, { pgdb }) => {
    const { maxDepth } = args

    const comments = await pgdb.public.comments.find({
      discussionId: discussion.id
    })

    const rootComment = {}
    assembleTree(rootComment, comments)
    measureTree(rootComment)
    if (maxDepth != null) {
      cutTreeX(rootComment, maxDepth)
    }

    return rootComment.comments
  }
}

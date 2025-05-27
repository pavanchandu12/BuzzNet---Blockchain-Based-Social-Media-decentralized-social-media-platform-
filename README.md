📱 SocialMedia Smart Contract

This is a Solidity smart contract for a decentralized social media platform that allows users to:

✅ Create posts (with text + media URL)

✅ Like posts (one like per user)

✅ Add comments to posts

✅ Retrieve post and comment data on-chain

🏗 Contract Overview

The contract includes:

Posts: Each has an ID, author, content, media URL, timestamp, likes, and comment count.

Likes: Users can like a post only once.

Comments: Each post can have multiple comments, each with its own ID, author, content, and timestamp.

📂 Key Components

Component	Description

createPost()	Create a new post with content + media URL

likePost()	Like a post (only once per address)

addComment()	Add a comment to a post

getPost()	Retrieve details of a post

getComment()	Retrieve a specific comment on a post

getCommentCount()	Get the total number of comments on a post

⚙️ Contract Details

Solidity version: ^0.8.0

Events:

PostCreated

PostLiked

CommentAdded

🛠 Deployment

1️⃣ Clone the repo:

git clone url

Go through the report


🤝 Contributing
Pull requests are welcome! Please fork the repository, create a feature branch, and submit a PR.

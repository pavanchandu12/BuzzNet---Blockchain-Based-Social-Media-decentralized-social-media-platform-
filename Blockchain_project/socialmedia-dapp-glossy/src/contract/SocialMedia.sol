// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SocialMedia {
    struct Post {
        uint id;
        address author;
        string content;
        string mediaURL;
        uint timestamp;
        uint likes;
        uint commentCount;
    }

    struct Comment {
        uint id;
        uint postId;
        address author;
        string content;
        uint timestamp;
    }

    uint public postCount = 0;
    mapping(uint => Post) public posts;
    mapping(uint => mapping(address => bool)) public liked;
    
    // Comment mappings
    mapping(uint => mapping(uint => Comment)) public comments;
    mapping(uint => uint) public commentCounts;

    event PostCreated(uint id, address author, string content, string mediaURL, uint timestamp);
    event PostLiked(uint id, address user);
    event CommentAdded(uint postId, uint commentId, address author, string content, uint timestamp);

    function createPost(string memory _content, string memory _mediaURL) public {
        postCount++;
        posts[postCount] = Post(postCount, msg.sender, _content, _mediaURL, block.timestamp, 0, 0);
        emit PostCreated(postCount, msg.sender, _content, _mediaURL, block.timestamp);
    }

    function likePost(uint _id) public {
        require(_id <= postCount, "Post does not exist");
        require(!liked[_id][msg.sender], "Already liked");

        liked[_id][msg.sender] = true;
        posts[_id].likes++;
        emit PostLiked(_id, msg.sender);
    }

    function addComment(uint _postId, string memory _content) public {
        require(_postId <= postCount, "Post does not exist");
        
        uint commentId = commentCounts[_postId] + 1;
        commentCounts[_postId] = commentId;
        comments[_postId][commentId] = Comment(commentId, _postId, msg.sender, _content, block.timestamp);
        posts[_postId].commentCount++;
        
        emit CommentAdded(_postId, commentId, msg.sender, _content, block.timestamp);
    }

    function getPost(uint _id) public view returns (Post memory) {
        return posts[_id];
    }

    function getComment(uint _postId, uint _commentId) public view returns (Comment memory) {
        require(_commentId <= commentCounts[_postId], "Comment does not exist");
        return comments[_postId][_commentId];
    }

    function getCommentCount(uint _postId) public view returns (uint) {
        return commentCounts[_postId];
    }
}
concept SongRecommender \[User, Song]

purpose
	To introduce a new song for the user each day

principle
	Each day, the system presents a new song to the user, chosen from a list of songs. 
	The user can listen to the song.
    Recommendations refresh daily and past recommendations can be revisited.
    
state
	a set of Users with
		a set of pastRecommendations of type Songs
		a set of notYetRecommendedSongs of type Songs

invariant
	The intersection of RecommendedSongs and NotYetRecommendedSongs is empty

actions
	addSongToCatalog(user: User, song: Song)
		requires song is not in pastRecommendations or notYetRecommendedSongs for user
		effect adds song to notYetRecommendedSongs for user
	generateRecommendation(user: User, count: Number): Song
		requires count is less than or equal to the number of songs in notYetRecommendedSongs for user
		effect returns count song recommendations, moves song(s) from notYetRecommendedSongs to pastRecommendations for user
	removeSong(user: User, song: Song)
		requires song to be in notYetRecommendedSongs for user
		effect removes song from notYetRecommendedSongs for user
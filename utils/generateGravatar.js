const gravatar= require('gravatar') ;

const generateGravatar = (email) => {
	// generate a url for the gravatar that is using https
	const avatar = gravatar.url(email, {
		protocol: 'https',
		s: '200', // size: 200x200
		r: 'PG', // rating: PG
		d: 'identicon', // default: identicon
		// d: 'https://www.newtreeimpact.com/app/uploads/2021/12/team-udaiyan-jatar-4.jpg', // default: identicon
	});
	return avatar;
};

module.exports= generateGravatar;

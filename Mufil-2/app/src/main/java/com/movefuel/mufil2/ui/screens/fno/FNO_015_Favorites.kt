package com.movefuel.mufil2.ui.screens.fno

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun FNO015FavoritesScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "FNO_015",
        title = "Favorites",
        subtitle = "Confirmed nutrition for the selected day.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.FNO_016,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.FNO_014,
        onNavigate = onNavigate,
    ) {
            MFNotice("No favorite confirmed foods", "Favorites remain empty until a user-confirmed food is saved.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun FNO015FavoritesScreenPreview() {
    MoveFuelTheme { FNO015FavoritesScreen {} }
}

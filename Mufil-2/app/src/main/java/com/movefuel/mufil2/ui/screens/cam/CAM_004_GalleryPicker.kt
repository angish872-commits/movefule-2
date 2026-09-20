package com.movefuel.mufil2.ui.screens.cam

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun CAM004GalleryPickerScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "CAM_004",
        title = "Gallery Picker",
        subtitle = "Food photo and gallery analysis with explicit review.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.CAM_005,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.CAM_003,
        onNavigate = onNavigate,
    ) {
            MFSectionTitle("Recent photos", "Thumbnails load progressively.")
            MFMediaPanel("Gallery", "Choose a food photo from your device.", true)
            MFListItem("IMG_2419", "Today · 12:44", "Select")
            MFListItem("IMG_2418", "Yesterday · 19:22", "Select")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun CAM004GalleryPickerScreenPreview() {
    MoveFuelTheme { CAM004GalleryPickerScreen {} }
}
